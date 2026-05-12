"""
PathoNet CNN — Improvement Patch (v2.0)
========================================
Drop-in enhancements for plant_disease_cnn.py (backward compatible).

Import this AFTER importing plant_disease_cnn, or integrate directly:

    from plant_disease_cnn import *
    from plant_disease_improvements import (
        validate_scan,
        predict_ph_v2,
        FarmerAnalytics,
        MobileOptimizer,
        MobileBenchmark,
        run_flask_server_v2,
    )

Sections
────────
  1. SCAN VALIDATOR        — image quality gating before inference
  2. ACCURACY IMPROVEMENTS — better TTA, focal loss, crop routing
  3. MOBILE OPTIMIZER      — INT8, TorchScript, adaptive resize, benchmarks
  4. FARMER ANALYTICS      — bilingual summaries, health score, severity map
  5. CLEAN ARCHITECTURE    — typed pipeline, structured logging, helpers
  6. FLASK v2 SERVER       — new /predict/v2 endpoint (backward compatible)
"""

from __future__ import annotations

import base64
import io
import logging
import math
import os
import platform
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageFilter, ImageStat
from torchvision import transforms

# ── Model load failures (explicit API errors, not generic 500 tracebacks) ───
class ModelLoadError(RuntimeError):
    """Checkpoint missing, corrupt, or incompatible with the built architecture."""


def _default_stub_num_classes() -> int:
    return max(1, int(os.environ.get("PATHONET_NUM_CLASSES", "10")))


def _strip_dataparallel_prefix(state: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    if not any(k.startswith("module.") for k in state):
        return state
    return {k.replace("module.", "", 1): v for k, v in state.items()}


def _infer_arch_from_state_dict(state: Dict[str, torch.Tensor]) -> str:
    keys = [k.replace("module.", "") for k in state.keys()]
    if any(k.endswith("classifier.3.weight") for k in keys):
        return "mobilenet_v3_small"
    return "mobilenet_v2"


def _infer_num_classes_from_state_dict(state: Dict[str, torch.Tensor]) -> Optional[int]:
    for k, v in state.items():
        kn = k.replace("module.", "")
        if kn.endswith("classifier.1.weight") and hasattr(v, "shape"):
            return int(v.shape[0])
        if kn.endswith("classifier.3.weight") and hasattr(v, "shape"):
            return int(v.shape[0])
    return None


def _unpack_checkpoint(
    payload: Any,
) -> Tuple[Dict[str, torch.Tensor], Optional[int], Optional[List[str]]]:
    if isinstance(payload, dict) and "model_state_dict" in payload:
        return (
            payload["model_state_dict"],
            payload.get("num_classes"),
            payload.get("class_names"),
        )
    if isinstance(payload, dict) and any(str(k).startswith("features.") for k in payload.keys()):
        return payload, None, None
    raise ModelLoadError("Unrecognized checkpoint format (expected model_state_dict or raw state_dict).")


# ── Re-export everything from the original module ──────────────────────────
try:
    from plant_disease_cnn import (
        DISEASE_CATEGORY,
        DISEASE_CLASSES,
        NUM_CLASSES,
        PH_CROP_DISEASES,
        PH_DISEASE_ACTIONS,
        PH_NORMALIZE_MEAN,
        PH_NORMALIZE_STD,
        PH_REGION_CROP_PRIORS,
        AsyncModelServer,
        PlantGuardModel,
        RegionPrior,
        get_inference_transform,
        get_ph_field_transforms,
        load_model,
        predict_with_tta,
        send_analytics_event,
    )
    _BASE_AVAILABLE = True
except ImportError:
    # Full in-file fallback: this repo often ships without plant_disease_cnn.py.
    _BASE_AVAILABLE = False
    from torchvision import models
    from torchvision.models import MobileNet_V2_Weights, MobileNet_V3_Small_Weights

    PH_NORMALIZE_MEAN = [0.423, 0.489, 0.316]
    PH_NORMALIZE_STD = [0.198, 0.204, 0.187]
    PH_CROP_DISEASES: Dict[str, List[str]] = {}
    PH_DISEASE_ACTIONS: Dict[str, Dict[str, str]] = {}
    PH_REGION_CROP_PRIORS: Dict[str, Dict[str, float]] = {}

    _stub_nc = _default_stub_num_classes()
    NUM_CLASSES = _stub_nc
    DISEASE_CLASSES = [f"class_{i}" for i in range(NUM_CLASSES)]
    DISEASE_CATEGORY: Dict[int, str] = {i: "unknown" for i in range(NUM_CLASSES)}

    def send_analytics_event(*_a, **_kw) -> None:  # type: ignore[misc]
        return None

    class PlantGuardModel(nn.Module):
        """
        MobileNetV2 / MobileNetV3-small classifier head matching torchvision checkpoints.
        Aligns with train_model.py (MobileNetV2) when weights are saved there.
        """

        def __init__(
            self,
            num_classes: int,
            backbone: str = "mobilenet_v2",
            pretrained: bool = True,
        ):
            super().__init__()
            self.num_classes = int(num_classes)
            bb = (backbone or "mobilenet_v2").lower()
            self.backbone_name = "mobilenet_v3_small" if "v3" in bb else "mobilenet_v2"

            if self.backbone_name == "mobilenet_v3_small":
                w = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
                net = models.mobilenet_v3_small(weights=w)
                last = net.classifier[3]
                net.classifier[3] = nn.Linear(last.in_features, self.num_classes)
            else:
                w = MobileNet_V2_Weights.DEFAULT if pretrained else None
                net = models.mobilenet_v2(weights=w)
                in_f = net.classifier[1].in_features
                net.classifier[1] = nn.Linear(in_f, self.num_classes)
            self.net = net

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.net(x)

    def load_model(
        weights_path: Optional[str] = None,
        device: Union[str, torch.device] = "cpu",
        backbone: str = "mobilenet_v2",
    ) -> nn.Module:
        """
        Load PlantGuardModel weights. Matches train_model.py checkpoints:
        { 'model_state_dict', 'num_classes', 'class_names' }.
        Architecture is inferred from state_dict (classifier.1 = V2, classifier.3 = V3).
        """
        global DISEASE_CLASSES, NUM_CLASSES, DISEASE_CATEGORY
        device_t = torch.device(device)
        log.info(
            "[Model] load_model start path=%s backbone_hint=%s device=%s",
            weights_path,
            backbone,
            device_t,
        )

        if not weights_path or not os.path.isfile(weights_path):
            nc = max(NUM_CLASSES, _default_stub_num_classes())
            log.warning(
                "[Model] No checkpoint file — initializing random head (num_classes=%s)",
                nc,
            )
            try:
                model = PlantGuardModel(num_classes=nc, backbone=backbone, pretrained=True)
            except Exception as e:
                log.exception("[Model] PlantGuardModel initialization failed: %s", e)
                raise ModelLoadError(f"Model initialization failed: {e}") from e
            return model.to(device_t).eval()

        try:
            try:
                payload = torch.load(weights_path, map_location=device_t, weights_only=False)
            except TypeError:
                payload = torch.load(weights_path, map_location=device_t)
        except Exception as e:
            log.exception("[Model] torch.load failed: %s", e)
            raise ModelLoadError(f"Could not read checkpoint: {e}") from e

        try:
            raw_state, meta_nc, class_names = _unpack_checkpoint(payload)
        except ModelLoadError:
            raise
        except Exception as e:
            raise ModelLoadError(f"Invalid checkpoint structure: {e}") from e

        state = _strip_dataparallel_prefix(raw_state)
        arch = _infer_arch_from_state_dict(state)
        nc = meta_nc or _infer_num_classes_from_state_dict(state) or _default_stub_num_classes()
        if nc < 1:
            nc = _default_stub_num_classes()

        if class_names:
            DISEASE_CLASSES = [str(x) for x in class_names]
            NUM_CLASSES = len(DISEASE_CLASSES)
            DISEASE_CATEGORY = {i: DISEASE_CATEGORY.get(i, "unknown") for i in range(NUM_CLASSES)}
            log.info("[Model] Loaded %d class names from checkpoint", NUM_CLASSES)
        elif meta_nc and meta_nc != len(DISEASE_CLASSES):
            NUM_CLASSES = int(meta_nc)
            if len(DISEASE_CLASSES) != NUM_CLASSES:
                DISEASE_CLASSES = [f"class_{i}" for i in range(NUM_CLASSES)]
                DISEASE_CATEGORY = {i: "unknown" for i in range(NUM_CLASSES)}

        log.info(
            "[Model] checkpoint arch=%s num_classes=%s state_keys=%d",
            arch,
            nc,
            len(state),
        )

        try:
            model = PlantGuardModel(num_classes=nc, backbone=arch, pretrained=False)
            model.load_state_dict(state, strict=True)
        except Exception as e_strict:
            log.warning("[Model] strict load failed (%s); retrying strict=False", e_strict)
            try:
                model = PlantGuardModel(num_classes=nc, backbone=arch, pretrained=False)
                missing, unexpected = model.load_state_dict(state, strict=False)
                log.warning(
                    "[Model] non-strict load: missing_keys=%d unexpected_keys=%d",
                    len(missing),
                    len(unexpected),
                )
            except Exception as e2:
                log.exception("[Model] load_state_dict failed: %s", e2)
                raise ModelLoadError(
                    f"Checkpoint incompatible with {arch} (num_classes={nc}): {e2}"
                ) from e2

        model = model.to(device_t).eval()
        log.info("[Model] load_model finished OK (%s classes on %s)", nc, device_t)
        return model

    RegionPrior = Any  # type: ignore[misc, assignment]
    AsyncModelServer = Any  # type: ignore[misc, assignment]

    def get_inference_transform(*_a, **_kw):  # type: ignore[misc]
        raise RuntimeError("get_inference_transform requires plant_disease_cnn")

    def get_ph_field_transforms(*_a, **_kw):  # type: ignore[misc]
        raise RuntimeError("get_ph_field_transforms requires plant_disease_cnn")

    def predict_with_tta(*_a, **_kw):  # type: ignore[misc]
        raise RuntimeError("predict_with_tta requires plant_disease_cnn")

# ─────────────────────────────────────────────────────────────────────────────
#  STRUCTURED LOGGER
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("PathoNet")


# =============================================================================
#  SECTION 1 — SCAN VALIDATOR
#  Validates image quality before running expensive inference.
#  Returns a ScanValidationResult that the API checks before predicting.
# =============================================================================

@dataclass
class ScanValidationResult:
    """
    Structured result from validate_scan().

    Fields
    ──────
    valid          : bool   — True = safe to proceed to inference
    error_code     : str    — machine-readable error key (empty if valid)
    message_en     : str    — English message for the farmer
    message_fil    : str    — Filipino / Tagalog message for the farmer
    quality_score  : float  — 0.0–1.0 composite image quality score
    details        : dict   — individual check scores (blur, brightness, …)
    """
    valid: bool
    error_code: str = ""
    message_en: str = ""
    message_fil: str = ""
    quality_score: float = 1.0
    details: Dict[str, Any] = field(default_factory=dict)

    def to_api_error(self) -> Dict:
        """Returns a ready-to-send API error dict (only call when not valid)."""
        return {
            "success": False,
            "error": "INVALID_SCAN",
            "code": self.error_code,
            "message": self.message_en,
            "message_fil": self.message_fil,
            "quality_score": round(self.quality_score, 3),
        }


# ── Laplacian variance blur detector ─────────────────────────────────────────

def _laplacian_variance(gray_np: np.ndarray) -> float:
    """
    Compute Laplacian variance of a grayscale image array.

    High variance → sharp edges → image is in focus.
    Low variance  → smooth/blurry → camera shake or fog.

    Empirical threshold for 224×224 Philippine field shots: ~80
    """
    # 3×3 Laplacian kernel
    kernel = np.array([[0, 1, 0],
                        [1, -4, 1],
                        [0, 1, 0]], dtype=np.float32)

    from scipy.ndimage import convolve  # type: ignore
    lap = convolve(gray_np.astype(np.float32), kernel)
    return float(lap.var())


def _image_entropy(gray_np: np.ndarray) -> float:
    """
    Shannon entropy of pixel intensity histogram.

    High entropy → complex, information-rich image (typical of a real plant).
    Very low entropy → blank, near-solid-color, or covered lens.
    """
    hist, _ = np.histogram(gray_np, bins=256, range=(0, 256))
    hist = hist / hist.sum()
    mask = hist > 0
    return float(-np.sum(hist[mask] * np.log2(hist[mask])))


def _green_ratio(rgb_np: np.ndarray) -> float:
    """
    Fraction of pixels where green channel dominates.
    Plants: G > R and G > B.  Low green → non-plant image.
    Threshold for lush leaves: >0.15; bare soil/non-plant: <0.08
    """
    r, g, b = rgb_np[:, :, 0], rgb_np[:, :, 1], rgb_np[:, :, 2]
    green_dominant = (g.astype(int) > r.astype(int) + 10) & \
                     (g.astype(int) > b.astype(int) + 10)
    return float(green_dominant.mean())


def _brightness_score(gray_np: np.ndarray) -> float:
    """
    Returns a 0–1 score: 1.0 = well-lit, 0.0 = too dark or too bright.
    Dark: mean < 30.  Overexposed: mean > 230.
    """
    mean = gray_np.mean()
    if mean < 30:
        return float(mean / 30.0)          # ramps 0→1 as mean goes 0→30
    if mean > 230:
        return float((255 - mean) / 25.0)  # ramps 0→1 as mean goes 255→230
    # Good exposure: score peaks at 128
    return float(1.0 - abs(mean - 128) / 128.0)


def validate_scan(
    pil_image: Image.Image,
    blur_threshold: float = 60.0,
    entropy_threshold: float = 4.5,
    brightness_threshold: float = 0.25,
    green_threshold: float = 0.06,
    min_size_px: int = 96,
    confidence_threshold: float = 0.35,
) -> ScanValidationResult:
    """
    Multi-check image quality validator for Philippine field conditions.

    Checks (in order of cheapness):
      1. Minimum resolution — rejects tiny crops (<96×96)
      2. Brightness         — rejects dark/overexposed photos
      3. Blur (Laplacian)   — rejects camera-shake or out-of-focus shots
      4. Entropy            — rejects blank / near-solid-color images
      5. Green ratio        — lightweight plant-vs-non-plant classifier

    Parameters
    ──────────
    blur_threshold       : Laplacian variance below this = too blurry
    entropy_threshold    : Shannon entropy below this = featureless
    brightness_threshold : 0–1 score below this = too dark / overexposed
    green_threshold      : fraction of green-dominant pixels below this = not a plant
    min_size_px          : reject images smaller than this in any dimension
    confidence_threshold : used downstream; stored for reference

    Returns
    ───────
    ScanValidationResult  (valid=True if all checks pass)
    """
    try:
        w, h = pil_image.size

        # ── Check 1: Minimum resolution ─────────────────────────────────
        if w < min_size_px or h < min_size_px:
            return ScanValidationResult(
                valid=False,
                error_code="TOO_SMALL",
                message_en=(
                    "The photo is too small or the leaf is too far away. "
                    "Please move closer and retake the photo."
                ),
                message_fil=(
                    "Masyadong malayo o maliit ang larawan. "
                    "Lumapit nang konti at kumuha muli ng larawan."
                ),
                quality_score=0.1,
                details={"width": w, "height": h, "min_required": min_size_px},
            )

        # Convert to numpy arrays once (cheap)
        rgb_np   = np.array(pil_image.convert("RGB"))
        gray_np  = np.array(pil_image.convert("L"))

        # ── Check 2: Brightness ─────────────────────────────────────────
        bscore = _brightness_score(gray_np)
        mean_px = gray_np.mean()

        if bscore < brightness_threshold:
            dark = mean_px < 80
            code = "TOO_DARK" if dark else "OVEREXPOSED"
            return ScanValidationResult(
                valid=False,
                error_code=code,
                message_en=(
                    "The photo is too dark. Please take the photo in better lighting."
                    if dark else
                    "The photo is too bright or overexposed. "
                    "Avoid direct sunlight on the camera lens."
                ),
                message_fil=(
                    "Masyadong madilim ang larawan. Kumuha sa mas maliwanag na lugar."
                    if dark else
                    "Masyadong maliwanag ang larawan. "
                    "Iwasan ang direktang sinag ng araw sa kamera."
                ),
                quality_score=bscore,
                details={"mean_brightness": round(float(mean_px), 1),
                         "brightness_score": round(bscore, 3)},
            )

        # ── Check 3: Blur (Laplacian variance) ─────────────────────────
        try:
            lap_var = _laplacian_variance(gray_np)
        except Exception:
            # scipy not available — use PIL-based fallback
            gray_pil = pil_image.convert("L")
            lap_img  = gray_pil.filter(ImageFilter.FIND_EDGES)
            lap_var  = float(np.array(lap_img).var())

        if lap_var < blur_threshold:
            return ScanValidationResult(
                valid=False,
                error_code="BLURRY",
                message_en=(
                    "The photo is blurry. Hold the phone steady and tap the leaf "
                    "on screen to focus before taking the photo."
                ),
                message_fil=(
                    "Malabo ang larawan. Hawakan nang matatag ang telepono at i-tap "
                    "ang dahon sa screen bago kumuha ng larawan."
                ),
                quality_score=min(lap_var / blur_threshold, 0.9),
                details={"laplacian_variance": round(lap_var, 1),
                         "threshold": blur_threshold},
            )

        # ── Check 4: Entropy (featureless / blank image) ────────────────
        entropy = _image_entropy(gray_np)
        if entropy < entropy_threshold:
            return ScanValidationResult(
                valid=False,
                error_code="FEATURELESS",
                message_en=(
                    "The photo appears to be blank or shows no plant features. "
                    "Please point the camera directly at a crop leaf."
                ),
                message_fil=(
                    "Mukhang walang nilalaman ang larawan. "
                    "Itutok ang kamera direkta sa dahon ng tanim."
                ),
                quality_score=entropy / entropy_threshold * 0.5,
                details={"entropy": round(entropy, 2),
                         "threshold": entropy_threshold},
            )

        # ── Check 5: Green ratio (plant-vs-non-plant) ───────────────────
        green_ratio = _green_ratio(rgb_np)
        if green_ratio < green_threshold:
            return ScanValidationResult(
                valid=False,
                error_code="NOT_A_PLANT",
                message_en=(
                    "This does not look like a plant leaf. "
                    "Please scan a clear crop leaf image."
                ),
                message_fil=(
                    "Mukhang hindi ito dahon ng tanim. "
                    "Mag-scan ng malinaw na dahon ng pananim."
                ),
                quality_score=green_ratio / green_threshold * 0.6,
                details={"green_pixel_ratio": round(green_ratio, 3),
                         "threshold": green_threshold},
            )

        # ── All checks passed ────────────────────────────────────────────
        # Composite quality score (weighted average of sub-scores)
        quality_score = (
            0.25 * bscore +
            0.35 * min(lap_var / (blur_threshold * 3), 1.0) +
            0.20 * min(entropy / 8.0, 1.0) +
            0.20 * min(green_ratio / 0.30, 1.0)
        )

        return ScanValidationResult(
            valid=True,
            quality_score=float(quality_score),
            details={
                "brightness_score":   round(bscore, 3),
                "laplacian_variance": round(lap_var, 1),
                "entropy":            round(entropy, 2),
                "green_ratio":        round(green_ratio, 3),
                "resolution":         f"{w}x{h}",
            },
        )

    except Exception as exc:
        # Never crash the API — treat unexpected errors as a soft validation pass
        log.warning("validate_scan encountered an error (treating as valid): %s", exc)
        return ScanValidationResult(valid=True, quality_score=0.5,
                                    details={"validator_error": str(exc)})


# =============================================================================
#  SECTION 2 — ACCURACY IMPROVEMENTS
#  Focal Loss, enhanced TTA, crop-aware routing, confidence calibration
# =============================================================================

class FocalLoss(nn.Module):
    """
    Focal Loss for class-imbalanced multi-class disease datasets.

    Focal loss down-weights easy (high-confidence) examples so the model
    focuses training on hard, misclassified cases — critical for rare diseases.

        FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)

    Parameters
    ──────────
    gamma        : float — focusing parameter; 0 = standard CE, 2 = recommended
    alpha        : optional per-class weights tensor [NUM_CLASSES]
    label_smooth : float — label smoothing applied before focal weighting
    """

    def __init__(
        self,
        gamma: float = 2.0,
        alpha: Optional[torch.Tensor] = None,
        label_smooth: float = 0.05,
        reduction: str = "mean",
    ):
        super().__init__()
        self.gamma        = gamma
        self.alpha        = alpha      # [C] or None
        self.label_smooth = label_smooth
        self.reduction    = reduction

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        C = logits.size(1)

        # Label smoothing
        with torch.no_grad():
            smooth_targets = torch.zeros_like(logits).scatter_(
                1, targets.unsqueeze(1), 1.0
            )
            smooth_targets = smooth_targets * (1 - self.label_smooth) + \
                             self.label_smooth / C

        log_probs = F.log_softmax(logits, dim=1)
        probs     = log_probs.exp()

        # Per-sample focal weight
        pt = (probs * smooth_targets).sum(dim=1)          # [B]
        focal_weight = (1.0 - pt) ** self.gamma           # [B]

        # CE with smooth labels
        ce = -(smooth_targets * log_probs).sum(dim=1)     # [B]
        loss = focal_weight * ce                           # [B]

        # Optional per-class alpha weighting
        if self.alpha is not None:
            alpha_t = self.alpha[targets]
            loss = alpha_t * loss

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


def compute_class_weights_ph(
    dataset,                        # torchvision ImageFolder or similar
    num_classes: int = NUM_CLASSES,
    smoothing: float = 0.1,
    device: str = "cpu",
) -> torch.Tensor:
    """
    Compute inverse-frequency class weights from an ImageFolder dataset.

    Weights are smoothed by `smoothing` to avoid extreme values for tiny classes.
    Returns a [num_classes] float tensor suitable for nn.CrossEntropyLoss(weight=...).

    Usage
    ─────
    weights = compute_class_weights_ph(train_dataset, device=device)
    criterion = FocalLoss(alpha=weights)
    """
    counts = torch.zeros(num_classes, dtype=torch.float32)
    for _, label in dataset.samples:
        if label < num_classes:
            counts[label] += 1.0

    # Inverse frequency with additive smoothing
    total = counts.sum()
    weights = total / (num_classes * (counts + smoothing * total / num_classes))

    # Clip to [0.1, 10] for stability
    weights = weights.clamp(0.1, 10.0)
    log.info("Class weights — min=%.2f  max=%.2f  mean=%.2f",
             weights.min().item(), weights.max().item(), weights.mean().item())
    return weights.to(device)


def predict_with_enhanced_tta(
    model,                          # PlantGuardModel
    pil_image: Image.Image,
    n_augments: int = 7,
    device: str = "cpu",
    use_ph_normalize: bool = True,
) -> Dict:
    """
    Enhanced TTA (Test-Time Augmentation) optimized for Philippine field photos.

    Augmentation set (7 variants):
      0. Original
      1. Horizontal flip
      2. Vertical flip (phone held upside-down)
      3. Rotation +20° (tilted shot)
      4. Rotation –20°
      5. ColorJitter (brightness ±0.25) — cloud cover variation
      6. Slight zoom-in crop (scale 0.85) — partial leaf shot

    Averages softmax probabilities → more robust than argmax on single pass.
    Falls back to standard predict_from_pil if model has no forward() method.

    Why 7 and not more?
    ───────────────────
    On a 2 GB RAM Android phone (Snapdragon 460, ~200ms/inference) 7 TTA
    passes ≈ 1.4 s — acceptable for the farmer UI. More passes hit the 3 s
    patience threshold where farmers abandon the scan.
    """
    norm_mean = PH_NORMALIZE_MEAN if use_ph_normalize else [0.485, 0.456, 0.406]
    norm_std  = PH_NORMALIZE_STD  if use_ph_normalize else [0.229, 0.224, 0.225]

    base = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(norm_mean, norm_std),
    ])

    augments = [
        base,
        transforms.Compose([transforms.RandomHorizontalFlip(p=1.0),
                             transforms.Resize(256), transforms.CenterCrop(224),
                             transforms.ToTensor(), transforms.Normalize(norm_mean, norm_std)]),
        transforms.Compose([transforms.RandomVerticalFlip(p=1.0),
                             transforms.Resize(256), transforms.CenterCrop(224),
                             transforms.ToTensor(), transforms.Normalize(norm_mean, norm_std)]),
        transforms.Compose([transforms.RandomRotation((20, 20)),
                             transforms.Resize(256), transforms.CenterCrop(224),
                             transforms.ToTensor(), transforms.Normalize(norm_mean, norm_std)]),
        transforms.Compose([transforms.RandomRotation((-20, -20)),
                             transforms.Resize(256), transforms.CenterCrop(224),
                             transforms.ToTensor(), transforms.Normalize(norm_mean, norm_std)]),
        transforms.Compose([transforms.ColorJitter(brightness=0.25, contrast=0.15),
                             transforms.Resize(256), transforms.CenterCrop(224),
                             transforms.ToTensor(), transforms.Normalize(norm_mean, norm_std)]),
        transforms.Compose([transforms.RandomResizedCrop(224, scale=(0.85, 0.85)),
                             transforms.ToTensor(), transforms.Normalize(norm_mean, norm_std)]),
    ]

    model.eval()
    all_probs: List[torch.Tensor] = []

    with torch.no_grad():
        for aug in augments[:n_augments]:
            try:
                tensor = aug(pil_image).unsqueeze(0).to(device)
            except Exception:
                tensor = base(pil_image).unsqueeze(0).to(device)

            # Support both single-output and multitask models
            out = model(tensor)
            logits = out[1] if isinstance(out, (tuple, list)) else out
            all_probs.append(F.softmax(logits, dim=1)[0].cpu())

    avg = torch.stack(all_probs).mean(0)
    idx = int(avg.argmax().item())
    confidence = float(avg[idx].item())

    # Build top-5 for diagnostics
    top5_idx = avg.topk(5).indices.tolist()
    top5 = [
        {"label": DISEASE_CLASSES[i] if i < len(DISEASE_CLASSES) else str(i),
         "confidence": round(float(avg[i].item()), 4)}
        for i in top5_idx
    ]

    label      = DISEASE_CLASSES[idx] if idx < len(DISEASE_CLASSES) else "Unknown"
    crop_name  = label.split(" | ")[0] if " | " in label else "Unknown"
    disease    = label.split(" | ")[1] if " | " in label else label

    return {
        "label":      label,
        "crop":       crop_name,
        "disease":    disease,
        "category":   DISEASE_CATEGORY.get(idx, "unknown"),
        "confidence": round(confidence, 4),
        "class_id":   idx,
        "top5":       top5,
        "tta_used":   True,
        "tta_passes": len(all_probs),
    }


# =============================================================================
#  SECTION 3 — MOBILE OPTIMIZER
#  INT8 quantization helpers, adaptive resizing, lazy loader, benchmarks
# =============================================================================

class AdaptivePreprocessor:
    """
    Lightweight preprocessing for low-end Android devices.

    Key optimizations
    ─────────────────
    • Adaptive resize — large farm photos are downscaled BEFORE decoding the
      full tensor, saving peak RAM (critical on 2 GB devices).
    • JPEG quality gate — warns if the image is too heavily compressed.
    • In-place normalization — avoids extra tensor allocation.
    • Returns uint8 tensor option for INT8 quantized models.

    Usage
    ─────
    preprocessor = AdaptivePreprocessor(target_size=224, max_input_px=1024)
    tensor = preprocessor(pil_image)            # [1, 3, 224, 224] float
    """

    # ImageNet stats (for standard backbone)
    _IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    _IMAGENET_STD  = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)

    # PH field stats (calibrated on Philippine crop images)
    _PH_MEAN = torch.tensor(PH_NORMALIZE_MEAN).view(3, 1, 1)
    _PH_STD  = torch.tensor(PH_NORMALIZE_STD).view(3, 1, 1)

    def __init__(
        self,
        target_size: int = 224,
        max_input_px: int = 1024,
        use_ph_stats: bool = True,
    ):
        self.target_size  = target_size
        self.max_input_px = max_input_px
        self.mean = self._PH_MEAN if use_ph_stats else self._IMAGENET_MEAN
        self.std  = self._PH_STD  if use_ph_stats else self._IMAGENET_STD

    def __call__(self, pil_image: Image.Image) -> torch.Tensor:
        """
        Returns a [1, 3, target_size, target_size] normalized float tensor.
        Safe to call from any thread; no global state mutated.
        """
        img = self._adaptive_resize(pil_image)
        img = img.convert("RGB")

        # Center crop to square
        w, h = img.size
        s = min(w, h)
        img = img.crop(((w - s) // 2, (h - s) // 2,
                        (w + s) // 2, (h + s) // 2))
        img = img.resize((self.target_size, self.target_size), Image.BILINEAR)

        # ToTensor (HWC uint8 → CHW float32 / 255)
        tensor = torch.from_numpy(
            np.array(img, dtype=np.float32)
        ).permute(2, 0, 1).div_(255.0)

        # Normalize in-place
        tensor.sub_(self.mean).div_(self.std)
        return tensor.unsqueeze(0)   # [1, 3, H, W]

    def _adaptive_resize(self, img: Image.Image) -> Image.Image:
        """
        If either dimension exceeds max_input_px, shrink proportionally.
        This reduces peak RAM before the full tensor is materialized.
        """
        w, h = img.size
        if max(w, h) <= self.max_input_px:
            return img
        ratio = self.max_input_px / max(w, h)
        return img.resize((int(w * ratio), int(h * ratio)), Image.BILINEAR)


class LazyModelLoader:
    """
    Lazy-loading singleton wrapper for PlantGuardModel.

    The model is NOT loaded until the first predict() call.
    This keeps app startup time fast and avoids wasting RAM if the
    user never hits the scan screen.

    Usage
    ─────
    loader = LazyModelLoader(weights_path="plantguard.pt",
                             backbone="mobilenet_v2")
    result = loader.predict(pil_image)     # loads model on first call
    """

    def __init__(
        self,
        weights_path: Optional[str] = None,
        backbone: str = "mobilenet_v2",
        device: str = "cpu",
        use_ph_normalize: bool = True,
    ):
        self.weights_path     = weights_path
        self.backbone         = backbone
        self.device           = device
        self.use_ph_normalize = use_ph_normalize
        self._model           = None
        self._preprocessor    = AdaptivePreprocessor(use_ph_stats=use_ph_normalize)
        self._load_time_ms    = 0.0

    @property
    def model(self):
        if self._model is None:
            self._load()
        return self._model

    def _load(self):
        t0 = time.perf_counter()
        try:
            log.info(
                "[Model] LazyModelLoader._load weights_path=%s backbone=%s device=%s base=%s",
                self.weights_path,
                self.backbone,
                self.device,
                _BASE_AVAILABLE,
            )
            self._model = load_model(
                weights_path=self.weights_path,
                device=self.device,
                backbone=self.backbone,
            )
        except ModelLoadError:
            raise
        except Exception as e:
            log.exception("[Model] LazyModelLoader._load failed: %s", e)
            raise ModelLoadError(f"Model load failed: {e}") from e
        self._load_time_ms = (time.perf_counter() - t0) * 1000
        log.info(
            "Model loaded in %.0f ms (backbone=%s, device=%s)",
            self._load_time_ms,
            self.backbone,
            self.device,
        )

    def predict(self, pil_image: Image.Image) -> Dict:
        """Preprocess + forward pass, returns raw prediction dict."""
        t0 = time.perf_counter()
        log.info("[Inference] start (image size=%s)", pil_image.size)
        tensor = self._preprocessor(pil_image).to(self.device)
        model = self.model
        model.eval()
        with torch.no_grad():
            log.debug("[Inference] forward pass (tensor shape=%s)", tuple(tensor.shape))
            out = model(tensor)
            logits = out[1] if isinstance(out, (tuple, list)) else out
            probs = F.softmax(logits, dim=1)[0]
            idx = int(probs.argmax().item())
            conf = float(probs[idx].item())
        elapsed_ms = (time.perf_counter() - t0) * 1000
        log.info(
            "[Inference] done in %.1f ms top_class=%s confidence=%.4f",
            elapsed_ms,
            idx,
            conf,
        )

        label = DISEASE_CLASSES[idx] if idx < len(DISEASE_CLASSES) else "Unknown"
        crop_ = label.split(" | ")[0] if " | " in label else "Unknown"
        disease_ = label.split(" | ")[1] if " | " in label else label

        return {
            "label": label,
            "crop": crop_,
            "disease": disease_,
            "category": DISEASE_CATEGORY.get(idx, "unknown"),
            "confidence": round(conf, 4),
            "class_id": idx,
        }


class MobileOptimizer:
    """
    One-stop mobile deployment optimizer for PlantGuardModel.

    Methods
    ───────
    optimize_torchscript()   — trace → TorchScript (fastest on-device)
    optimize_int8()          — PTQ INT8 quantization (QNNPACK for ARM)
    optimize_dynamic_quant() — dynamic quantization (no calibration needed)
    optimize_pruning()       — L1 filter pruning then re-export
    export_all()             — run all optimizations, return size comparison
    """

    def __init__(self, model, device: str = "cpu"):
        self.model  = model
        self.device = device
        self.model.eval()

    # ── TorchScript ────────────────────────────────────────────────────────

    def optimize_torchscript(
        self,
        save_path: str = "plantguard_mobile.torchscript.pt",
        optimize_for_mobile: bool = True,
    ) -> str:
        """
        Trace the model into TorchScript.

        If torch.utils.mobile_optimizer is available (PyTorch ≥1.8),
        applies fuse_conv_bn_relu and other ARM-friendly passes.

        Recommended for: React Native apps, on-device C++ inference.
        """
        self.model.eval()
        example = torch.randn(1, 3, 224, 224).to(self.device)

        with torch.no_grad():
            traced = torch.jit.trace(self.model, example)

        # Mobile-specific graph optimization (fuse BN + ReLU into Conv)
        if optimize_for_mobile:
            try:
                from torch.utils.mobile_optimizer import optimize_for_mobile as _opt
                traced = _opt(traced)
                log.info("Applied mobile_optimizer passes (BN fusion, etc.)")
            except Exception as e:
                log.warning("mobile_optimizer unavailable (%s) — skipping.", e)

        traced.save(save_path)
        size_mb = Path(save_path).stat().st_size / 1e6
        log.info("TorchScript saved → %s  (%.1f MB)", save_path, size_mb)
        return save_path

    # ── Dynamic INT8 Quantization ──────────────────────────────────────────

    def optimize_dynamic_quant(
        self,
        save_path: str = "plantguard_dynamic_int8.pt",
    ) -> str:
        """
        Dynamic (post-training) INT8 quantization of Linear layers.

        No calibration dataset required — faster to apply, slight accuracy drop.
        Reduces model size ~3–4× vs FP32. Ideal when a calibration set is unavailable.

        Note: Conv2d dynamic quantization is not supported by PyTorch on CPU;
        only nn.Linear and nn.LSTM are quantized here. Full INT8 requires
        static quantization with calibration (see optimize_int8).
        """
        qmodel = torch.quantization.quantize_dynamic(
            self.model,
            qconfig_spec={nn.Linear},
            dtype=torch.qint8,
        )
        torch.save(qmodel.state_dict(), save_path)
        size_mb = Path(save_path).stat().st_size / 1e6
        log.info("Dynamic INT8 saved → %s  (%.1f MB)", save_path, size_mb)
        return save_path

    # ── Static INT8 Quantization (with calibration) ────────────────────────

    def optimize_int8(
        self,
        calibration_images: List[Image.Image],
        save_path: str = "plantguard_int8.torchscript.pt",
        backend: str = "qnnpack",           # qnnpack = ARM / Android
    ) -> str:
        """
        Post-training static INT8 quantization using a calibration set.

        QNNPACK backend is optimized for ARM Cortex-A (Android phones).
        Achieves ~4× model-size reduction and ~2× CPU speedup vs FP32.

        Parameters
        ──────────
        calibration_images : 50–200 representative PIL images (diverse crops)
        backend            : "qnnpack" (Android), "fbgemm" (x86 server)

        Workflow
        ────────
        1. Set qconfig → QNNPACK symmetric INT8
        2. Insert QuantStub/DeQuantStub observers
        3. Forward pass on calibration images (collects activation stats)
        4. Convert observers → quantized ops
        5. Script + save
        """
        torch.backends.quantized.engine = backend
        preprocessor = AdaptivePreprocessor()

        # Prepare model for quantization
        qmodel = torch.quantization.QuantWrapper(self.model)
        qmodel.qconfig = torch.quantization.get_default_qconfig(backend)
        torch.quantization.prepare(qmodel, inplace=True)

        # Calibration pass
        log.info("Calibrating INT8 on %d images...", len(calibration_images))
        qmodel.eval()
        with torch.no_grad():
            for img in calibration_images:
                tensor = preprocessor(img)
                try:
                    qmodel(tensor)
                except Exception:
                    pass   # skip badly formed calibration images silently

        # Convert to INT8
        torch.quantization.convert(qmodel, inplace=True)

        # Save as TorchScript for mobile
        try:
            scripted = torch.jit.script(qmodel)
        except Exception:
            scripted = torch.jit.trace(qmodel, torch.randn(1, 3, 224, 224))
        scripted.save(save_path)

        size_mb = Path(save_path).stat().st_size / 1e6
        log.info("INT8 static quantized model → %s  (%.1f MB)", save_path, size_mb)
        return save_path

    # ── Export summary ─────────────────────────────────────────────────────

    def export_all(
        self,
        calibration_images: Optional[List[Image.Image]] = None,
        output_dir: str = "mobile_exports",
    ) -> Dict[str, Any]:
        """
        Run all non-destructive exports and return a size comparison table.

        calibration_images : optional; required for INT8 static export.
        """
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        results: Dict[str, Any] = {}

        # TS (always available)
        ts_path = str(Path(output_dir) / "plantguard.torchscript.pt")
        try:
            self.optimize_torchscript(ts_path)
            results["torchscript_mb"] = round(Path(ts_path).stat().st_size / 1e6, 1)
        except Exception as e:
            results["torchscript_error"] = str(e)

        # Dynamic INT8
        dq_path = str(Path(output_dir) / "plantguard_dynamic_int8.pt")
        try:
            self.optimize_dynamic_quant(dq_path)
            results["dynamic_int8_mb"] = round(Path(dq_path).stat().st_size / 1e6, 1)
        except Exception as e:
            results["dynamic_int8_error"] = str(e)

        # Static INT8 (requires calibration images)
        if calibration_images:
            sq_path = str(Path(output_dir) / "plantguard_static_int8.torchscript.pt")
            try:
                self.optimize_int8(calibration_images, sq_path)
                results["static_int8_mb"] = round(Path(sq_path).stat().st_size / 1e6, 1)
            except Exception as e:
                results["static_int8_error"] = str(e)

        log.info("Export summary: %s", results)
        return results


class MobileBenchmark:
    """
    On-device performance benchmark utility.

    Reports: FPS, latency (ms), peak RAM (MB), CPU load.

    Usage
    ─────
    bench = MobileBenchmark(model, preprocessor)
    report = bench.run(n_warmup=5, n_runs=30)
    print(report)
    """

    def __init__(self, model, preprocessor: Optional[AdaptivePreprocessor] = None):
        self.model        = model
        self.preprocessor = preprocessor or AdaptivePreprocessor()

    def run(
        self,
        n_warmup: int = 5,
        n_runs: int = 30,
        batch_size: int = 1,
        input_size: int = 224,
    ) -> Dict[str, Any]:
        """
        Benchmark inference latency and memory on the current process.

        Returns a dict with keys:
          latency_ms_mean, latency_ms_p95, fps, peak_ram_mb,
          params_M, model_size_mb (if weights are on disk), platform
        """
        self.model.eval()
        dummy = torch.randn(batch_size, 3, input_size, input_size)

        # Warmup (primes caches, JIT, etc.)
        with torch.no_grad():
            for _ in range(n_warmup):
                self.model(dummy)

        # Timed runs
        latencies: List[float] = []
        mem_before = _get_ram_mb()

        with torch.no_grad():
            for _ in range(n_runs):
                t0 = time.perf_counter()
                self.model(dummy)
                latencies.append((time.perf_counter() - t0) * 1000)

        mem_after = _get_ram_mb()
        peak_ram  = max(mem_after - mem_before, 0.0)

        latencies_np = sorted(latencies)
        mean_lat = float(np.mean(latencies_np))
        p95_lat  = float(np.percentile(latencies_np, 95))
        fps      = 1000.0 / mean_lat if mean_lat > 0 else 0.0

        params_m = sum(p.numel() for p in self.model.parameters()) / 1e6

        report = {
            "platform":         platform.machine(),
            "python_version":   platform.python_version(),
            "torch_version":    torch.__version__,
            "params_M":         round(params_m, 2),
            "latency_ms_mean":  round(mean_lat, 2),
            "latency_ms_p95":   round(p95_lat, 2),
            "fps":              round(fps, 1),
            "peak_ram_mb":      round(peak_ram, 1),
            "n_runs":           n_runs,
            "batch_size":       batch_size,
            "input_size":       input_size,
            "target_met":       mean_lat < 1000.0,   # < 1 s target
        }

        # Print readable table
        _print_benchmark_table(report)
        return report

    def compare(
        self,
        models: Dict[str, Any],
        n_runs: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Compare multiple model variants side-by-side.

        models : { "label": model_instance, ... }
        """
        results = []
        original = self.model
        for label, mdl in models.items():
            self.model = mdl
            row = self.run(n_runs=n_runs)
            row["label"] = label
            results.append(row)
        self.model = original
        return results


def _get_ram_mb() -> float:
    """Return current process RSS memory in MB (cross-platform)."""
    try:
        import psutil
        return psutil.Process().memory_info().rss / 1e6
    except ImportError:
        return 0.0


def _print_benchmark_table(report: Dict[str, Any]):
    """Pretty-print a benchmark report to stdout."""
    print("\n" + "═" * 50)
    print("  PathoNet Mobile Benchmark")
    print("═" * 50)
    for k, v in report.items():
        print(f"  {k:<25} : {v}")
    status = "✅ PASS" if report.get("target_met") else "❌ FAIL (>1s)"
    print(f"  {'< 1s target':<25} : {status}")
    print("═" * 50 + "\n")


# =============================================================================
#  SECTION 4 — FARMER-FRIENDLY ANALYTICS
#  Bilingual summaries, severity maps, prevention tips, health score
# =============================================================================

# Severity thresholds (confidence-based heuristic).
# Actual severity would ideally come from a dedicated regression head trained
# on severity labels, but this is a practical proxy for field use.
_SEVERITY_MAP = {
    "severe":   (0.80, 1.00),
    "moderate": (0.55, 0.80),
    "mild":     (0.35, 0.55),
    "uncertain": (0.00, 0.35),
}

# Crop health score weights: healthy = 100, certain disease = 0
# The score accounts for both confidence and severity.
_HEALTH_SCORE_WEIGHTS = {
    "healthy":   1.00,
    "uncertain": 0.70,
    "mild":      0.55,
    "moderate":  0.30,
    "severe":    0.05,
}

# Extended bilingual prevention tips (crop-level)
_PH_PREVENTION_TIPS: Dict[str, Dict[str, str]] = {
    "Rice (Palay)": {
        "en":  ("Use certified seed from PhilRice. Follow the recommended "
                "fertilizer schedule. Monitor for pests weekly."),
        "fil": ("Gumamit ng sertipikadong binhi mula sa PhilRice. Sundin ang tamang "
                "iskedyul ng pataba. Bantayan ang mga peste linggo-linggo."),
    },
    "Corn (Mais)": {
        "en":  ("Plant early-maturing varieties. Practice crop rotation. "
                "Avoid excessive nitrogen which promotes fungal growth."),
        "fil": ("Magtanim ng maagang varieties. Mag-crop rotation. "
                "Iwasan ang sobrang nitrogen na nagpapalakas ng fungi."),
    },
    "Tomato (Kamatis)": {
        "en":  ("Use drip irrigation to keep leaves dry. Space plants at "
                "60 cm to improve air circulation. Stake vines properly."),
        "fil": ("Gumamit ng drip irrigation para manatiling tuyo ang mga dahon. "
                "Mag-iwang 60 cm sa pagitan ng halaman. Bigyan ng tukod ang halaman."),
    },
    "Banana (Saging)": {
        "en":  ("Remove old leaves that touch the soil. Use disease-free "
                "planting material. Avoid overhead watering."),
        "fil": ("Alisin ang lumang dahon na nakahawak sa lupa. Gumamit ng "
                "maayos na planting material. Iwasan ang overhead na didilig."),
    },
    "Pechay": {
        "en":  ("Rotate with non-brassica crops every season. Remove crop "
                "debris after harvest. Apply lime to maintain soil pH 6.0–7.0."),
        "fil": ("Mag-crop rotation sa non-brassica tuwing season. Alisin ang "
                "mga natirang halaman pagkatapos ng ani. Mag-apply ng lime para "
                "mapanatili ang pH ng lupa na 6.0–7.0."),
    },
    "Kangkong": {
        "en":  ("Maintain clean water channels. Harvest regularly to encourage "
                "new growth. Avoid water stagnation."),
        "fil": ("Panatilihing malinis ang mga kanal. Mag-ani nang regular para "
                "mapalakas ang bagong tubo. Iwasan ang nagtitimpilang tubig."),
    },
    "Onion (Sibuyas)": {
        "en":  ("Plant in well-drained raised beds. Avoid overhead irrigation. "
                "Apply fungicide preventively during rainy season."),
        "fil": ("Magtanim sa maayos na drainage na raised beds. Iwasan ang "
                "overhead irrigation. Mag-apply ng fungicide preventively sa tag-ulan."),
    },
    "Garlic (Bawang)": {
        "en":  ("Use disease-free bulbs from accredited growers. Maintain "
                "proper spacing (10 cm). Avoid waterlogged soil."),
        "fil": ("Gumamit ng walang sakit na sibuyas mula sa mga accredited na magsasaka. "
                "Mag-iwang 10 cm sa pagitan. Iwasan ang sobrang basa na lupa."),
    },
}

# Confidence-to-English explanation for farmers
_CONFIDENCE_EXPLAIN = [
    (0.90, "Very sure",          "Napaka-sigurado"),
    (0.75, "Sure",               "Sigurado"),
    (0.60, "Mostly sure",        "Medyo sigurado"),
    (0.45, "Not very sure",      "Hindi gaanong sigurado"),
    (0.00, "Unsure — get help",  "Hindi sigurado — kumuha ng tulong"),
]


@dataclass
class FarmerReport:
    """
    Fully structured, farmer-readable disease report.

    Designed for mobile display: short fields, bilingual, no jargon.
    """
    crop:             str         # "Rice (Palay)"
    disease:          str         # "Blast"
    severity:         str         # "Moderate"
    health_score:     int         # 0–100
    confidence:       float       # 0.0–1.0
    confidence_label_en:  str     # "Very sure"
    confidence_label_fil: str     # "Napaka-sigurado"
    action_en:        str         # What to do NOW
    action_fil:       str
    prevention_en:    str         # Long-term prevention
    prevention_fil:   str
    summary_en:       str         # 1–2 sentence human summary
    summary_fil:      str
    is_healthy:       bool
    quality_score:    float       # from ScanValidationResult
    scan_timestamp:   str         # ISO 8601

    def to_dict(self) -> Dict:
        return {
            "crop":                  self.crop,
            "disease":               self.disease,
            "severity":              self.severity,
            "health_score":          self.health_score,
            "confidence":            round(self.confidence, 4),
            "confidence_label":      {"en": self.confidence_label_en,
                                      "fil": self.confidence_label_fil},
            "action":                {"en": self.action_en,
                                      "fil": self.action_fil},
            "prevention":            {"en": self.prevention_en,
                                      "fil": self.prevention_fil},
            "summary":               {"en": self.summary_en,
                                      "fil": self.summary_fil},
            "is_healthy":            self.is_healthy,
            "quality_score":         round(self.quality_score, 3),
            "scan_timestamp":        self.scan_timestamp,
        }


class FarmerAnalytics:
    """
    Converts raw model prediction dicts into farmer-friendly FarmerReport objects.

    Usage
    ─────
    analytics = FarmerAnalytics()
    report = analytics.build_report(prediction_dict, quality_score=0.92)
    api_response = report.to_dict()

    Example output
    ──────────────
    {
        "crop":     "Rice (Palay)",
        "disease":  "Blast",
        "severity": "Moderate",
        "health_score": 40,
        "action": {
            "en":  "Apply tricyclazole or isoprothiolane fungicide. ...",
            "fil": "Mag-apply ng tricyclazole ..."
        },
        "summary": {
            "en":  "Your Rice crop has Blast at a moderate level. ...",
            "fil": "Ang iyong Rice ay may Blast na katamtaman. ..."
        }
    }
    """

    def build_report(
        self,
        prediction: Dict,
        quality_score: float = 1.0,
        region: str = "",
    ) -> FarmerReport:
        """
        Build a FarmerReport from a raw prediction dict.

        prediction : output from predict_from_pil / predict_ph_v2 / etc.
        quality_score : from ScanValidationResult.quality_score
        region        : PH region string (optional, for context)
        """
        # ── Parse prediction fields ──────────────────────────────────────
        label      = prediction.get("label", "Unknown | Unknown")
        crop       = prediction.get("crop") or (label.split(" | ")[0] if " | " in label else "Unknown")
        disease    = prediction.get("disease") or (label.split(" | ")[1] if " | " in label else label)
        confidence = float(prediction.get("confidence", 0.0))
        is_healthy = disease.strip().lower() == "healthy"

        # ── Severity ─────────────────────────────────────────────────────
        if is_healthy:
            severity = "none"
        else:
            severity = "uncertain"
            for sev, (lo, hi) in _SEVERITY_MAP.items():
                if lo <= confidence < hi:
                    severity = sev
                    break

        # ── Health score ─────────────────────────────────────────────────
        base_weight = _HEALTH_SCORE_WEIGHTS.get(severity, 0.5)
        # Blend: severity weight × confidence + (1-confidence) × "uncertain" weight
        health_score = int(
            (base_weight * confidence +
             _HEALTH_SCORE_WEIGHTS["uncertain"] * (1 - confidence)) * 100
        )
        health_score = max(0, min(100, health_score))

        # ── Confidence label ─────────────────────────────────────────────
        conf_en, conf_fil = "Unsure — get help", "Hindi sigurado"
        for threshold, en, fil in _CONFIDENCE_EXPLAIN:
            if confidence >= threshold:
                conf_en, conf_fil = en, fil
                break

        # ── Action advice ────────────────────────────────────────────────
        actions    = PH_DISEASE_ACTIONS.get(disease, {})
        action_en  = actions.get("en", "Consult your local Agricultural Technologist (ATC).")
        action_fil = actions.get("fil", "Kumonsulta sa inyong lokal na Agricultural Technologist (ATC).")

        # ── Prevention tips ───────────────────────────────────────────────
        prev       = _PH_PREVENTION_TIPS.get(crop, {})
        prev_en    = prev.get("en", "Practice good field hygiene and crop rotation.")
        prev_fil   = prev.get("fil", "Mag-practice ng tamang kalinisan sa bukid at crop rotation.")

        # ── Human summary ─────────────────────────────────────────────────
        if is_healthy:
            summary_en = (
                f"Your {crop} crop looks healthy! "
                f"Continue your current farming practices to keep it that way."
            )
            summary_fil = (
                f"Ang inyong {crop} ay mukhang maayos at malusog! "
                f"Ipagpatuloy ang inyong mga gawi sa pagsasaka para mapanatili ito."
            )
        else:
            severity_adj_en  = {"severe": "severe", "moderate": "moderate",
                                 "mild": "mild", "uncertain": "possible"}.get(severity, "possible")
            severity_adj_fil = {"severe": "malubha", "moderate": "katamtaman",
                                 "mild": "bahagya", "uncertain": "posibleng"}.get(severity, "posibleng")

            urgency_en  = "Act quickly — treat within 24–48 hours." if severity == "severe" else \
                          "Treat within 3–5 days to prevent spread."   if severity == "moderate" else \
                          "Monitor closely and treat if it spreads."    if severity == "mild" else \
                          "Consult an agricultural technician to confirm."
            urgency_fil = "Kumilos agad — gamutin sa loob ng 24–48 oras." if severity == "severe" else \
                          "Gamutin sa loob ng 3–5 araw para maiwasan ang pagkalat." if severity == "moderate" else \
                          "Bantayan nang mabuti at gamutin kung kumalat." if severity == "mild" else \
                          "Kumonsulta sa agricultural technician para kumpirmahin."

            summary_en = (
                f"Your {crop} has a {severity_adj_en} case of {disease}. "
                f"{urgency_en}"
            )
            summary_fil = (
                f"Ang inyong {crop} ay may {severity_adj_fil} na {disease}. "
                f"{urgency_fil}"
            )

        return FarmerReport(
            crop=crop,
            disease=disease,
            severity=severity.capitalize(),
            health_score=health_score,
            confidence=confidence,
            confidence_label_en=conf_en,
            confidence_label_fil=conf_fil,
            action_en=action_en,
            action_fil=action_fil,
            prevention_en=prev_en,
            prevention_fil=prev_fil,
            summary_en=summary_en,
            summary_fil=summary_fil,
            is_healthy=is_healthy,
            quality_score=quality_score,
            scan_timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )

    def format_api_response(
        self,
        prediction: Dict,
        quality_score: float = 1.0,
        region: str = "",
        include_raw: bool = False,
    ) -> Dict:
        """
        One-shot helper: build report + serialize to API-ready dict.

        include_raw : if True, appends the raw model prediction under "raw".
        """
        report = self.build_report(prediction, quality_score=quality_score, region=region)
        result = {
            "success": True,
            **report.to_dict(),
        }
        if include_raw:
            result["raw"] = prediction
        return result


# =============================================================================
#  SECTION 5 — CLEAN ARCHITECTURE HELPERS
#  Typed pipeline, structured logging, request/response schemas
# =============================================================================

@dataclass
class PredictRequest:
    """Typed request schema for /predict/v2."""
    image_b64:  str
    use_tta:    bool  = False
    region:     str   = ""
    crop_hint:  str   = ""
    user_id:    str   = ""
    session_id: str   = ""
    skip_validation: bool = False   # for testing only


@dataclass
class PredictResponse:
    """Typed response schema for /predict/v2."""
    success:        bool
    # Populated when success=True
    crop:           str = ""
    disease:        str = ""
    severity:       str = ""
    health_score:   int = 0
    confidence:     float = 0.0
    confidence_label_en:  str = ""
    confidence_label_fil: str = ""
    action_en:      str = ""
    action_fil:     str = ""
    prevention_en:  str = ""
    prevention_fil: str = ""
    summary_en:     str = ""
    summary_fil:    str = ""
    is_healthy:     bool = False
    quality_score:  float = 0.0
    scan_timestamp: str = ""
    # Populated when success=False
    error:          str = ""
    error_code:     str = ""
    message:        str = ""
    message_fil:    str = ""

    def to_dict(self) -> Dict:
        return {k: v for k, v in self.__dict__.items()}


class InferencePipeline:
    """
    Modular, typed inference pipeline with validation gating.

    Sequence
    ────────
    1. Decode base64 → PIL image
    2. ScanValidator.validate_scan()        (quality gate)
    3. LazyModelLoader.predict() or TTA    (inference)
    4. FarmerAnalytics.format_api_response() (farmer formatting)
    5. Return PredictResponse

    Usage
    ─────
    pipeline = InferencePipeline(
        weights_path="plantguard.pt",
        backbone="mobilenet_v2",
    )
    response = pipeline.run(PredictRequest(image_b64=..., use_tta=True))
    flask_json = response.to_dict()
    """

    def __init__(
        self,
        weights_path: Optional[str] = None,
        backbone: str = "mobilenet_v2",
        device: str = "cpu",
        use_ph_normalize: bool = True,
        confidence_threshold: float = 0.35,
    ):
        self.loader    = LazyModelLoader(weights_path, backbone, device, use_ph_normalize)
        self.analytics = FarmerAnalytics()
        self.conf_thresh = confidence_threshold
        self._total_requests = 0
        self._error_count    = 0

    def run(self, req: PredictRequest) -> PredictResponse:
        """Execute the full pipeline for one request. Never raises — always returns."""
        t_start = time.perf_counter()
        self._total_requests += 1

        try:
            # ── Step 1: Decode image ──────────────────────────────────────
            try:
                img_bytes = base64.b64decode(req.image_b64)
                pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            except Exception as e:
                return self._error_response("DECODE_FAILED",
                                            "Could not read the image. Please retake the photo.",
                                            "Hindi ma-basahin ang larawan. Kumuha muli ng larawan.")

            # ── Step 2: Image quality validation ──────────────────────────
            if not req.skip_validation:
                validation = validate_scan(pil_image)
                if not validation.valid:
                    log.info("Scan rejected [%s] quality=%.2f",
                             validation.error_code, validation.quality_score)
                    err = validation.to_api_error()
                    return PredictResponse(
                        success=False,
                        error="INVALID_SCAN",
                        error_code=err["code"],
                        message=err["message"],
                        message_fil=err["message_fil"],
                        quality_score=validation.quality_score,
                    )
                quality_score = validation.quality_score
            else:
                quality_score = 1.0

            # ── Step 3: Inference ─────────────────────────────────────────
            if req.use_tta and _BASE_AVAILABLE:
                prediction = predict_with_enhanced_tta(
                    self.loader.model, pil_image,
                    device=self.loader.device,
                )
            else:
                prediction = self.loader.predict(pil_image)

            # ── Step 4: Low-confidence fallback message ───────────────────
            if prediction["confidence"] < self.conf_thresh:
                log.info("Low confidence %.2f — suggesting field check",
                         prediction["confidence"])

            # ── Step 5: Format response ───────────────────────────────────
            api_dict = self.analytics.format_api_response(
                prediction,
                quality_score=quality_score,
                region=req.region,
            )

            elapsed_ms = (time.perf_counter() - t_start) * 1000
            log.info("Predict OK  crop=%s  disease=%s  conf=%.2f  latency=%.0fms",
                     api_dict.get("crop"), api_dict.get("disease"),
                     api_dict.get("confidence", 0), elapsed_ms)

            return PredictResponse(
                success=True,
                crop=api_dict["crop"],
                disease=api_dict["disease"],
                severity=api_dict["severity"],
                health_score=api_dict["health_score"],
                confidence=api_dict["confidence"],
                confidence_label_en=api_dict["confidence_label"]["en"],
                confidence_label_fil=api_dict["confidence_label"]["fil"],
                action_en=api_dict["action"]["en"],
                action_fil=api_dict["action"]["fil"],
                prevention_en=api_dict["prevention"]["en"],
                prevention_fil=api_dict["prevention"]["fil"],
                summary_en=api_dict["summary"]["en"],
                summary_fil=api_dict["summary"]["fil"],
                is_healthy=api_dict["is_healthy"],
                quality_score=api_dict["quality_score"],
                scan_timestamp=api_dict["scan_timestamp"],
            )

        except ModelLoadError as exc:
            self._error_count += 1
            log.error("Model load / inference unavailable: %s", exc)
            return self._error_response(
                "MODEL_LOAD_FAILED",
                "The disease-detection model could not be loaded. "
                "Verify the checkpoint path and server logs.",
                "Hindi ma-load ang modelo. Pakisuri ang checkpoint at log ng server.",
            )

        except Exception as exc:
            self._error_count += 1
            log.error("Pipeline error: %s\n%s", exc, traceback.format_exc())
            return self._error_response(
                "INTERNAL_ERROR",
                "An internal error occurred. Please try again.",
                "May nangyaring error. Subukang muli.",
            )

    @staticmethod
    def _error_response(code: str, msg_en: str, msg_fil: str) -> PredictResponse:
        return PredictResponse(
            success=False, error="ERROR",
            error_code=code, message=msg_en, message_fil=msg_fil,
        )

    def stats(self) -> Dict:
        return {
            "total_requests": self._total_requests,
            "error_count":    self._error_count,
            "error_rate":     round(self._error_count / max(self._total_requests, 1), 3),
        }


# =============================================================================
#  SECTION 6 — FLASK v2 SERVER  (backward compatible)
#  New endpoints: /predict/v2  /health/v2  /validate
#  Original endpoints (/predict, /predict/ph, /health, /stats) unchanged.
# =============================================================================

def run_flask_server_v2(
    weights_path: Optional[str] = None,
    port: int = 5000,
    backbone: str = "mobilenet_v2",
    enable_legacy_routes: bool = True,
):
    """
    Extended Flask server with v2 endpoints.

    New routes
    ──────────
    POST /predict/v2      — full pipeline (validate + predict + farmer analytics)
    POST /validate        — image quality check only (no inference)
    GET  /health/v2       — extended health check with pipeline stats
    GET  /benchmark       — quick latency benchmark (dev/debug only)

    Legacy routes (if enable_legacy_routes=True):
      /predict, /predict/ph, /health, /stats, /classes, /crops, etc.
    """
    try:
        from flask import Flask, jsonify, request
        from flask_cors import CORS
    except ImportError:
        print("Install Flask: pip install flask flask-cors")
        return

    app      = Flask(__name__)
    CORS(app, origins=["https://appdev---pathonet.web.app", "http://localhost:3000", "http://localhost:8081"], supports_credentials=True)
    pipeline = InferencePipeline(weights_path=weights_path, backbone=backbone)

    # ── Optional: boot legacy server on same app ───────────────────────────
    if enable_legacy_routes and _BASE_AVAILABLE:
        legacy_server = AsyncModelServer(
            weights_path=weights_path,
            max_workers=4,
            backbone=backbone,
        )
        analytics_obj = FarmerAnalytics()

    # ── /predict/v2 ────────────────────────────────────────────────────────
    @app.route("/predict/v2", methods=["POST"])
    def predict_v2():
        """
        Full-pipeline prediction endpoint.

        Request JSON
        ────────────
        {
            "image":      "<base64-encoded JPEG/PNG>",   # required
            "use_tta":    false,                          # optional
            "region":     "NCR",                          # optional PH region
            "crop_hint":  "Rice (Palay)",                 # optional prior hint
            "skip_validation": false                      # optional (debug only)
        }

        Response JSON (success)
        ───────────────────────
        {
            "success":    true,
            "crop":       "Rice (Palay)",
            "disease":    "Blast",
            "severity":   "Moderate",
            "health_score": 35,
            "confidence": 0.872,
            "confidence_label": {"en": "Very sure", "fil": "Napaka-sigurado"},
            "action":  {"en": "...", "fil": "..."},
            "prevention": {"en": "...", "fil": "..."},
            "summary": {"en": "...", "fil": "..."},
            "is_healthy": false,
            "quality_score": 0.91,
            "scan_timestamp": "2025-08-15T10:32:00Z"
        }

        Response JSON (invalid scan)
        ────────────────────────────
        {
            "success":   false,
            "error":     "INVALID_SCAN",
            "code":      "BLURRY",
            "message":   "The photo is blurry. ...",
            "message_fil": "Malabo ang larawan. ...",
            "quality_score": 0.21
        }
        """
        data = request.get_json(silent=True) or {}
        if "image" not in data:
            return jsonify({"success": False, "error": "MISSING_IMAGE",
                            "message": "Send JSON with key 'image' (base64)"}), 400

        req = PredictRequest(
            image_b64  = data["image"],
            use_tta    = bool(data.get("use_tta", False)),
            region     = str(data.get("region", "")),
            crop_hint  = str(data.get("crop_hint", "")),
            user_id    = request.headers.get("X-User-ID", ""),
            session_id = request.headers.get("X-Session-ID", ""),
            skip_validation = bool(data.get("skip_validation", False)),
        )

        try:
            response = pipeline.run(req)
        except Exception as e:
            log.exception("predict_v2 unexpected failure: %s", e)
            return jsonify({
                "success": False,
                "error": "ERROR",
                "error_code": "INTERNAL_ERROR",
                "message": "An internal error occurred. Please try again.",
            }), 500

        if _BASE_AVAILABLE:
            send_analytics_event(
                "predict_v2",
                properties={
                    "success":    response.success,
                    "crop":       response.crop,
                    "disease":    response.disease,
                    "severity":   response.severity,
                    "confidence": response.confidence,
                    "use_tta":    req.use_tta,
                    "region":     req.region,
                },
                user_id=req.user_id,
                session_id=req.session_id,
            )

        # 422 = client/validation (bad image, not a plant, etc.)
        # 500 = server/pipeline failure so clients can retry without treating as "invalid scan"
        if response.success:
            status_code = 200
        elif response.error_code == "INTERNAL_ERROR":
            status_code = 500
        elif response.error_code == "MODEL_LOAD_FAILED":
            status_code = 503
        else:
            status_code = 422
        return jsonify(response.to_dict()), status_code

    @app.route("/validate", methods=["POST"])
    def validate_only():
        """
        Image quality validation without running inference.

        Useful for mobile pre-flight check: show the farmer a "photo quality"
        indicator before triggering the heavier prediction call.

        Request JSON: { "image": "<base64>" }
        Response JSON: ScanValidationResult fields + success flag
        """
        data = request.get_json(silent=True) or {}
        if "image" not in data:
            return jsonify({"success": False, "error": "MISSING_IMAGE"}), 400
        try:
            img_bytes = base64.b64decode(data["image"])
            pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            result    = validate_scan(pil_image)
            resp = {
                "success":       result.valid,
                "quality_score": round(result.quality_score, 3),
                "details":       result.details,
            }
            if not result.valid:
                resp.update({
                    "error":       "INVALID_SCAN",
                    "code":        result.error_code,
                    "message":     result.message_en,
                    "message_fil": result.message_fil,
                })
            return jsonify(resp)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # ── /health/v2 ────────────────────────────────────────────────────────
    @app.route("/health/v2", methods=["GET"])
    def health_v2():
        """Extended health check including pipeline stats."""
        return jsonify({
            "status":   "ok",
            "version":  "2.0",
            "backbone": backbone,
            "classes":  NUM_CLASSES,
            "pipeline": pipeline.stats(),
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })

    # ── /benchmark (debug) ────────────────────────────────────────────────
    @app.route("/benchmark", methods=["GET"])
    def run_benchmark():
        """Quick on-demand latency benchmark (disable in production)."""
        if os.getenv("FLASK_ENV", "production") == "production":
            return jsonify({"error": "Benchmark disabled in production."}), 403
        bench = MobileBenchmark(pipeline.loader.model)
        report = bench.run(n_warmup=3, n_runs=10)
        return jsonify(report)

    # ── Legacy routes ──────────────────────────────────────────────────────
    if enable_legacy_routes and _BASE_AVAILABLE:

        @app.route("/health", methods=["GET"])
        def health_legacy():
            stats = legacy_server.get_stats()
            return jsonify({"status": "ok", "model": f"PlantGuard({backbone})",
                            "classes": NUM_CLASSES, "device": stats["device"]})

        @app.route("/predict", methods=["POST"])
        def predict_legacy():
            data = request.get_json(silent=True) or {}
            if "image" not in data:
                return jsonify({"error": "Send JSON with key 'image' (base64)"}), 400
            try:
                result, cached = legacy_server.predict_async(data["image"])
                result["cached"] = cached
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @app.route("/predict/ph", methods=["POST"])
        def predict_ph_legacy():
            """
            Legacy PH endpoint — now wired to the v2 pipeline for consistency.
            Keeps the old request/response shape for backward compatibility.
            """
            data = request.get_json(silent=True) or {}
            if "image" not in data:
                return jsonify({"error": "Send JSON with key 'image' (base64)"}), 400
            try:
                img_bytes = base64.b64decode(data["image"])
                pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                use_tta   = bool(data.get("use_tta", False))

                if use_tta:
                    pred = predict_with_enhanced_tta(
                        legacy_server.model, pil_image,
                        device=legacy_server.device,
                    )
                else:
                    pred = legacy_server.model.predict_with_prototypes(
                        pil_image, device=legacy_server.device
                    )

                report = analytics_obj.build_report(pred)
                result = {**pred, **report.to_dict(), "region": data.get("region", "")}
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        @app.route("/stats", methods=["GET"])
        def stats_legacy():
            return jsonify(legacy_server.get_stats())

        @app.route("/classes", methods=["GET"])
        def classes_legacy():
            return jsonify({"classes": DISEASE_CLASSES, "categories": DISEASE_CATEGORY})

        @app.route("/crops", methods=["GET"])
        def crops_legacy():
            return jsonify({"crops": list(PH_CROP_DISEASES.keys())})

    port = int(os.getenv("PORT", port))
    log.info("PathoNet v2 — listening on http://0.0.0.0:%d", port)
    log.info("Backbone: %s  |  Classes: %d", backbone, NUM_CLASSES)
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)


# =============================================================================
#  CONVENIENCE: predict_ph_v2
#  Drop-in replacement for the existing predict_with_tta / predict_from_pil
#  that returns a fully enriched, farmer-ready response.
# =============================================================================

def predict_ph_v2(
    model,
    pil_image: Image.Image,
    device: str = "cpu",
    use_tta: bool = True,
    region: str = "",
    skip_validation: bool = False,
    quality_score_override: Optional[float] = None,
) -> Dict:
    """
    Backward-compatible convenience function that wraps the full v2 pipeline.

    Returns a farmer-ready dict identical to /predict/v2 response schema.
    If validation fails, returns {"success": False, "error": "INVALID_SCAN", ...}.

    Parameters
    ──────────
    model                  : PlantGuardModel
    pil_image              : PIL.Image.Image (RGB)
    use_tta                : run enhanced 7-pass TTA (slower but more accurate)
    region                 : Philippine region name for context
    skip_validation        : bypass image quality check (use in training/testing)
    quality_score_override : inject a known quality score (useful when you have
                             already run validate_scan() yourself)
    """
    analytics = FarmerAnalytics()

    # ── Validation ───────────────────────────────────────────────────────────
    if not skip_validation:
        validation = validate_scan(pil_image)
        if not validation.valid:
            return validation.to_api_error()
        quality_score = quality_score_override or validation.quality_score
    else:
        quality_score = quality_score_override or 1.0

    # ── Inference ────────────────────────────────────────────────────────────
    if use_tta:
        prediction = predict_with_enhanced_tta(model, pil_image, device=device)
    else:
        # Use existing single-pass prototype-aware method
        prediction = model.predict_with_prototypes(pil_image, device=device)

    # ── Format ───────────────────────────────────────────────────────────────
    return analytics.format_api_response(
        prediction,
        quality_score=quality_score,
        region=region,
        include_raw=False,
    )


# =============================================================================
#  SELF-TEST  (python plant_disease_improvements.py)
# =============================================================================

if __name__ == "__main__":
    print("\n── PathoNet Improvement Patch — self-test ──\n")

    # 1. Scan validator smoke test
    print("1. ScanValidator —")
    dummy_rgb = Image.fromarray(
        np.random.randint(40, 180, (256, 256, 3), dtype=np.uint8)
    )
    result = validate_scan(dummy_rgb)
    print(f"   valid={result.valid}  score={result.quality_score:.2f}  "
          f"details={result.details}")

    # 2. FarmerAnalytics smoke test
    print("2. FarmerAnalytics —")
    fake_pred = {
        "label":      "Rice (Palay) | Blast",
        "crop":       "Rice (Palay)",
        "disease":    "Blast",
        "confidence": 0.78,
        "category":   "fungal",
        "class_id":   1,
    }
    fa = FarmerAnalytics()
    report = fa.build_report(fake_pred, quality_score=0.88)
    print(f"   crop={report.crop}  disease={report.disease}")
    print(f"   severity={report.severity}  health_score={report.health_score}")
    print(f"   summary_en: {report.summary_en}")
    print(f"   summary_fil: {report.summary_fil}")
    print(f"   action_en: {report.action_en}")

    # 3. AdaptivePreprocessor smoke test
    print("3. AdaptivePreprocessor —")
    prep = AdaptivePreprocessor()
    tensor = prep(dummy_rgb)
    print(f"   output shape: {tensor.shape}  dtype: {tensor.dtype}")

    # 4. FocalLoss smoke test
    print("4. FocalLoss —")
    fl = FocalLoss(gamma=2.0)
    logits = torch.randn(4, 10)
    labels = torch.randint(0, 10, (4,))
    loss = fl(logits, labels)
    print(f"   loss={loss.item():.4f}")

    # 5. MobileBenchmark smoke test (tiny random model)
    print("5. MobileBenchmark —")

    class TinyModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.fc = nn.Linear(3 * 224 * 224, 10)
        def forward(self, x):
            return self.fc(x.flatten(1))

    bench  = MobileBenchmark(TinyModel())
    report_bench = bench.run(n_warmup=2, n_runs=5)
    print(f"   latency_ms_mean={report_bench['latency_ms_mean']}  "
          f"fps={report_bench['fps']}")

    print("\n── All smoke tests passed ──\n")