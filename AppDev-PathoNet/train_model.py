#!/usr/bin/env python3
"""
PathoNet Model Training Script
==============================
Trains MobileNetV2 on Philippine crop disease dataset.

Usage:
    python train_model.py --data_dir ./data --epochs 50 --batch_size 32

Requirements:
    - Dataset structure: data_dir/<crop>/<disease>/<images>
    - Or use ImageFolder with class folders
"""

import argparse
import os
import time
from pathlib import Path
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms
from torchvision.models import MobileNet_V2_Weights

# Add app/components to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app', 'components'))
from PathoNetV1 import DISEASE_CLASSES, NUM_CLASSES, PH_NORMALIZE_MEAN, PH_NORMALIZE_STD

# ─── Configuration ───────────────────────────────────────────────────────────

DEFAULT_DATA_DIR = "./data"
DEFAULT_BATCH_SIZE = 32
DEFAULT_EPOCHS = 50
DEFAULT_LEARNING_RATE = 0.001
DEFAULT_OUTPUT_DIR = "./models"

# Philippine-specific normalization (calibrated on PH crop images)
PH_NORMALIZE_TRANSFORM = transforms.Normalize(
    mean=PH_NORMALIZE_MEAN,
    std=PH_NORMALIZE_STD
)

# ─── Data Transformations ────────────────────────────────────────────────────

def get_train_transforms():
    """Training transforms with augmentation."""
    return transforms.Compose([
        transforms.Resize(256),
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        PH_NORMALIZE_TRANSFORM,
    ])

def get_val_transforms():
    """Validation/test transforms (no augmentation)."""
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        PH_NORMALIZE_TRANSFORM,
    ])

# ─── Model Setup ─────────────────────────────────────────────────────────────

def create_model(num_classes=NUM_CLASSES, pretrained=True):
    """
    Create MobileNetV2 model for Philippine crop disease classification.
    
    Args:
        num_classes: Number of disease classes
        pretrained: Use ImageNet pretrained weights
    
    Returns:
        model: MobileNetV2 with custom classifier head
    """
    # Load pretrained MobileNetV2
    weights = MobileNet_V2_Weights.DEFAULT if pretrained else None
    model = models.mobilenet_v2(weights=weights)
    
    # Freeze feature extractor initially (optional, can unfreeze later)
    for param in model.features.parameters():
        param.requires_grad = False
    
    # Replace classifier head
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    
    return model

# ─── Training Functions ───────────────────────────────────────────────────────

def train_epoch(model, dataloader, criterion, optimizer, device):
    """Train for one epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for inputs, labels in dataloader:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
    
    epoch_loss = running_loss / len(dataloader)
    epoch_acc = 100. * correct / total
    return epoch_loss, epoch_acc

def validate(model, dataloader, criterion, device):
    """Validate the model."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
    
    epoch_loss = running_loss / len(dataloader)
    epoch_acc = 100. * correct / total
    return epoch_loss, epoch_acc

# ─── Main Training Loop ───────────────────────────────────────────────────────

def train_model(
    data_dir,
    output_dir=DEFAULT_OUTPUT_DIR,
    epochs=DEFAULT_EPOCHS,
    batch_size=DEFAULT_BATCH_SIZE,
    learning_rate=DEFAULT_LEARNING_RATE,
    device=None,
):
    """
    Main training function.
    
    Args:
        data_dir: Path to dataset directory
        output_dir: Directory to save trained model
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate for optimizer
        device: Device to train on (cuda/cpu)
    """
    # Setup device
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load dataset
    print(f"Loading dataset from: {data_dir}")
    full_dataset = datasets.ImageFolder(
        root=data_dir,
        transform=get_train_transforms()
    )
    
    print(f"Dataset size: {len(full_dataset)} images")
    print(f"Number of classes: {len(full_dataset.classes)}")
    print(f"Classes: {full_dataset.classes}")
    
    # Split into train/validation (80/20)
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(
        full_dataset, [train_size, val_size],
        generator=torch.Generator().manual_seed(42)
    )
    
    # Update validation transform
    val_dataset.dataset.transform = get_val_transforms()
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True, num_workers=4
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False, num_workers=4
    )
    
    # Create model
    print("Creating MobileNetV2 model...")
    model = create_model(num_classes=NUM_CLASSES, pretrained=True)
    model = model.to(device)
    
    # Loss function with class weights (optional)
    criterion = nn.CrossEntropyLoss()
    
    # Optimizer
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)
    
    # Training loop
    print(f"\nStarting training for {epochs} epochs...")
    best_val_acc = 0.0
    
    for epoch in range(epochs):
        epoch_start = time.time()
        
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step()
        
        epoch_time = time.time() - epoch_start
        
        print(f"Epoch [{epoch+1}/{epochs}] - {epoch_time:.1f}s")
        print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"  Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_path = os.path.join(output_dir, "plantguard_best.pt")
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'val_loss': val_loss,
            }, best_model_path)
            print(f"  ✓ Saved best model (val_acc: {val_acc:.2f}%)")
    
    # Save final model
    final_model_path = os.path.join(output_dir, "plantguard_final.pt")
    torch.save({
        'model_state_dict': model.state_dict(),
        'num_classes': NUM_CLASSES,
        'class_names': full_dataset.classes,
    }, final_model_path)
    print(f"\n✓ Training complete!")
    print(f"✓ Best validation accuracy: {best_val_acc:.2f}%")
    print(f"✓ Model saved to: {final_model_path}")
    
    return model, final_model_path

# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PathoNet model")
    parser.add_argument("--data_dir", type=str, default=DEFAULT_DATA_DIR,
                        help="Path to dataset directory")
    parser.add_argument("--output_dir", type=str, default=DEFAULT_OUTPUT_DIR,
                        help="Directory to save trained model")
    parser.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS,
                        help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=DEFAULT_BATCH_SIZE,
                        help="Batch size for training")
    parser.add_argument("--learning_rate", type=float, default=DEFAULT_LEARNING_RATE,
                        help="Learning rate")
    parser.add_argument("--device", type=str, default=None,
                        help="Device to train on (cuda/cpu)")
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("  🌱 PathoNet Model Training")
    print("=" * 70)
    print(f"Data directory: {args.data_dir}")
    print(f"Output directory: {args.output_dir}")
    print(f"Epochs: {args.epochs}")
    print(f"Batch size: {args.batch_size}")
    print(f"Learning rate: {args.learning_rate}")
    print("=" * 70)
    print()
    
    # Check if data directory exists
    if not os.path.exists(args.data_dir):
        print(f"❌ Error: Data directory not found: {args.data_dir}")
        print("\nExpected dataset structure:")
        print("  data_dir/")
        print("    ├── Rice_Palay_Healthy/")
        print("    ├── Rice_Palay_Blast/")
        print("    ├── Corn_Mais_Healthy/")
        print("    └── ... (other disease classes)")
        print("\nPlease organize your dataset and try again.")
        sys.exit(1)
    
    # Train model
    try:
        model, model_path = train_model(
            data_dir=args.data_dir,
            output_dir=args.output_dir,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            device=args.device,
        )
        print(f"\n✓ Model saved to: {model_path}")
        print(f"\nTo use the trained model, update run_api_server.py:")
        print(f'  run_flask_server_v2(weights_path="{model_path}", port=5000)')
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
