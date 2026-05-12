# PathoNet Model Training Guide

This guide explains how to train the PathoNet model to analyze actual plant features instead of using pseudo-random predictions.

## Why Training is Needed

Currently, the system runs in **STUB mode** without trained weights, which means:
- Predictions are pseudo-random based on image hash
- No actual plant feature analysis
- Misclassifications (e.g., kangkong → palay, palay → tomato)

Training the model with real Philippine crop disease data will enable:
- Actual plant feature analysis
- Accurate disease detection
- Reliable crop classification

## Prerequisites

### Software Requirements
```bash
pip install torch torchvision pillow
```

### Hardware Requirements
- GPU recommended (NVIDIA CUDA) for faster training
- Minimum 8GB RAM
- At least 5GB disk space for dataset and model

## Dataset Preparation

### Dataset Structure
Organize your dataset as follows:

```
data/
├── Rice_Palay_Healthy/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── ...
├── Rice_Palay_Blast/
│   ├── image1.jpg
│   └── ...
├── Corn_Mais_Healthy/
│   └── ...
├── Tomato_Kamatis_Healthy/
│   └── ...
└── ... (other disease classes)
```

### Supported Crop Classes
The model is trained to detect 40 disease classes across 8 Philippine crops:

- **Rice (Palay)**: Healthy, Blast, Bacterial Leaf Blight, Sheath Blight, Tungro
- **Corn (Mais)**: Healthy, Northern Corn Leaf Blight, Gray Leaf Spot, Rust, Stalk Rot
- **Tomato (Kamatis)**: Healthy, Early Blight, Late Blight, Leaf Curl, Bacterial Wilt
- **Banana (Saging)**: Healthy, Sigatoka, Moko, Bunchy Top, Panama Disease
- **Pechay**: Healthy, Downy Mildew, Black Rot, Aphids, Cabbage Worm
- **Kangkong**: Healthy, Leaf Spot, Rust, Aphids, Root Rot
- **Onion (Sibuyas)**: Healthy, Downy Mildew, Purple Blotch, Thrips, Neck Rot
- **Garlic (Bawang)**: Healthy, Purple Stripe, Basal Rot, Leaf Blight, Mosaic

### Minimum Data Requirements
- **Per class**: At least 50-100 images for basic training
- **Recommended**: 200-500 images per class for good accuracy
- **Total dataset**: 2,000-20,000 images

### Image Quality Requirements
- Resolution: At least 224x224 pixels
- Format: JPG or PNG
- Lighting: Good, even lighting (avoid direct flash)
- Focus: Clear, sharp images of plant leaves
- Background: Simple, contrasting background preferred

## Training the Model

### Basic Training
```bash
python train_model.py --data_dir ./data --epochs 50 --batch_size 32
```

### Advanced Training Options
```bash
python train_model.py \
    --data_dir ./data \
    --output_dir ./models \
    --epochs 100 \
    --batch_size 64 \
    --learning_rate 0.001 \
    --device cuda  # Use GPU if available
```

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--data_dir` | `./data` | Path to dataset directory |
| `--output_dir` | `./models` | Directory to save trained model |
| `--epochs` | `50` | Number of training epochs |
| `--batch_size` | `32` | Batch size for training |
| `--learning_rate` | `0.001` | Learning rate for optimizer |
| `--device` | `auto` | Device to train on (cuda/cpu) |

### Training Process

1. **Data Loading**: Loads images from dataset directory
2. **Data Augmentation**: Applies random rotations, flips, color adjustments
3. **Model Training**: Trains MobileNetV2 on your dataset
4. **Validation**: Evaluates model on validation set (20% of data)
5. **Model Saving**: Saves best and final models to output directory

### Expected Training Time

| Dataset Size | GPU (CUDA) | CPU Only |
|--------------|------------|----------|
| 2,000 images | ~30 minutes | ~2-3 hours |
| 5,000 images | ~1 hour | ~6-8 hours |
| 10,000 images | ~2 hours | ~12-16 hours |

## Using the Trained Model

### Automatic Loading
Once trained, the API server will automatically load the model:

```bash
npm run web
```

The server checks for `./models/plantguard_final.pt` and loads it if available.

### Manual Loading
If you want to specify a different model path:

```python
# In run_api_server.py
run_flask_server_v2(weights_path="./path/to/your/model.pt", port=5000)
```

## Model Evaluation

### Validation Metrics
During training, you'll see:
- **Train Loss/Accuracy**: Performance on training data
- **Val Loss/Accuracy**: Performance on validation data
- **Best Model**: Saved when validation accuracy improves

### Target Accuracy
- **Basic**: >70% validation accuracy
- **Good**: >85% validation accuracy
- **Excellent**: >90% validation accuracy

### Testing the Model
After training, test the model:

```bash
# Start the API server
python run_api_server.py

# Test with a sample image
curl -X POST http://localhost:5000/predict/v2 \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```

## Troubleshooting

### Out of Memory Error
- Reduce batch size: `--batch_size 16`
- Use smaller model or reduce image size

### Poor Accuracy
- Increase dataset size
- Ensure balanced classes (similar number of images per class)
- Increase training epochs
- Check image quality and labeling

### CUDA Out of Memory
- Reduce batch size
- Use CPU: `--device cpu`
- Clear GPU cache between runs

### Class Mismatch
- Ensure folder names match expected disease classes
- Check for typos in class names
- Verify all classes have at least some images

## Next Steps

1. **Collect Dataset**: Gather labeled images of Philippine crop diseases
2. **Organize Data**: Structure dataset according to the format above
3. **Train Model**: Run training script with appropriate parameters
4. **Evaluate**: Check validation accuracy and test predictions
5. **Deploy**: Server will automatically load trained model
6. **Monitor**: Track model performance in production

## Additional Resources

- **MobileNetV2 Paper**: https://arxiv.org/abs/1801.04381
- **PyTorch Documentation**: https://pytorch.org/docs/
- **PlantVillage Dataset**: https://www.kaggle.com/datasets/emmarex/plant-disease (for reference)

## Support

If you encounter issues:
1. Check dataset structure matches expected format
2. Verify all images are valid and readable
3. Ensure sufficient disk space and memory
4. Review training logs for error messages
