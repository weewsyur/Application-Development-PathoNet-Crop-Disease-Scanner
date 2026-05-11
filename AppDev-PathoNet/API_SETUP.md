# PathoNet API Server Setup

## Prerequisites

- Python 3.8+ installed
- Virtual environment (.venv) already set up in your project

## Installation & Setup

### 1. Activate Virtual Environment

```powershell
# On Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# On Windows (Command Prompt)
.\.venv\Scripts\activate.bat

# On macOS/Linux
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

⏱️ **Note**: PyTorch download may take 5-15 minutes depending on internet speed.

### 3. Run the API Server

```bash
python run_api_server.py
```

You should see:

```
======================================================================
  🌱 PathoNet Disease Detection API Server
======================================================================

✓ Starting Flask server on http://localhost:5000
✓ Health check:  GET  http://localhost:5000/health
✓ Predictions:   POST http://localhost:5000/predict
✓ Classes:       GET  http://localhost:5000/classes
✓ Performance:   GET  http://localhost:5000/stats

Device: GPU (or CPU if no GPU available)
Workers: 4 (concurrent request handling)

Press Ctrl+C to stop the server.
```

## 🚀 Async Optimizations

The API now includes **concurrent request handling** and **intelligent caching**:

- **AsyncModelServer**: Manages up to 4 concurrent predictions
- **Result Caching**: Identical image scans return cached results instantly
- **GPU Acceleration**: Automatically uses CUDA if available
- **Model Warmup**: Pre-loads model on startup for faster first request
- **Performance Stats**: Monitor inference speed and cache hit rates

## Testing the API

### Health Check

```bash
curl http://localhost:5000/health
```

**Response:**

```json
{
  "status": "ok",
  "model": "PlantGuardCNN",
  "classes": 14,
  "device": "GPU",
  "cache_hit_rate": "0%"
}
```

### Get Performance Stats

```bash
curl http://localhost:5000/stats
```

**Response:**

```json
{
  "device": "GPU",
  "total_inferences": 42,
  "avg_inference_time_ms": 185.5,
  "cache_hits": 8,
  "cache_misses": 34,
  "cache_hit_rate": 19.05,
  "cached_results": 12
}
```

### Get Available Classes

```bash
curl http://localhost:5000/classes
```

### Make a Prediction (requires base64 image)

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"image":"<BASE64_ENCODED_IMAGE>"}'
```

## Using with the Expo App

Once the server is running on `http://localhost:5000`, your Expo app will automatically connect to it when you:

1. **Android Emulator**: Uses `http://10.0.2.2:5000` (special host mapping)
2. **iOS Simulator**: Uses `http://localhost:5000`
3. **Physical Device**: Update `API_BASE` in `app/(tabs)/Scan.tsx` to your machine's IP address

### For Physical Device Testing

If testing on a real phone, update the API_BASE in `Scan.tsx`:

```typescript
const API_BASE = "http://<YOUR_MACHINE_IP>:5000";
```

Then start your Flask server to listen on all interfaces:

```bash
# The current run_api_server.py already does this (0.0.0.0)
```

## Optional: Using Trained Weights

If you have trained model weights (`.pt` file):

Edit `run_api_server.py` and uncomment:

```python
run_flask_server(weights_path="path/to/your/weights.pt", port=5000)
```

## ⚡ Async & Caching Features

### How Concurrency Works

The API uses **ThreadPoolExecutor** with 4 workers to handle multiple requests simultaneously:

- Request 1 → Worker 1 (GPU inference)
- Request 2 → Worker 2 (waits or queued)
- Request 3 → Worker 3 (can run concurrently)
- Request 4 → Worker 4

**Result**: Multiple users can scan images without blocking each other.

### Intelligent Result Caching

Identical images return cached results **instantly** (< 5ms):

- Cache stores last 100 unique prediction results
- Cache key = MD5 hash of image data
- Useful for duplicate scans or image retries

**Example**: If 5 users scan the same tomato leaf image, only the first run inference. The next 4 get cached results.

### GPU Acceleration

The server automatically detects and uses CUDA (NVIDIA GPU) if available:

- **GPU**: ~150-200ms per inference
- **CPU**: ~400-800ms per inference

Check device in `/health` or `/stats` endpoint response.

### Model Warmup

On startup, the model runs a dummy pass to:

- Load weights into GPU memory
- Optimize CUDA kernels
- Ensure first user request is fast (~same speed as subsequent)

## Troubleshooting

| Issue                                          | Solution                                                      |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `ModuleNotFoundError: No module named 'torch'` | Run `pip install -r requirements.txt` again                   |
| `Address already in use`                       | Change port in `run_api_server.py` (default: 5000)            |
| `Connection refused from app`                  | Ensure server is running AND check firewall/network           |
| `Timeout errors on device`                     | Update API_BASE to your machine's IP address                  |
| Slow inference (>2 seconds)                    | Check `/stats` for cache hit rate; ensure GPU is detected     |
| GPU not detected                               | Install CUDA & cuDNN; verify with `torch.cuda.is_available()` |
| High cache misses                              | Normal for varied images; cache helps with duplicates         |

## Architecture Notes

The PlantGuardCNN model:

- **Input**: 224×224 RGB images
- **Layers**: 9 depthwise-separable convolution layers (MobileNet-style)
- **Output**: Disease classification + confidence score
- **Model Size**: ~1.2M parameters (lightweight for edge deployment)
- **Detects**: Fungal infections, bacterial diseases, pest damage, healthy

The Flask API provides three endpoints:

1. `GET /health` - Server status
2. `POST /predict` - Image classification
3. `GET /classes` - Available disease classes
