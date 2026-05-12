/**
 * PathoNet Client-Side ML Prediction
 * Direct integration without API dependency
 */

// Note: TensorFlow.js will be installed via package.json
// import * as tf from '@tensorflow/tfjs';

// Disease categories and responses
const DISEASE_CATEGORIES = {
  healthy: {
    name: "Healthy Plant",
    recommendations: [
      "Continue regular monitoring",
      "Maintain proper watering and fertilization",
      "Practice good crop rotation"
    ],
    color: "#22c55e"
  },
  bacterial_leaf_blight: {
    name: "Bacterial Leaf Blight",
    recommendations: [
      "Apply copper-based bactericides",
      "Remove infected leaves",
      "Improve air circulation",
      "Avoid overhead watering"
    ],
    color: "#ef4444"
  },
  leaf_spot: {
    name: "Leaf Spot Disease",
    recommendations: [
      "Apply fungicide treatment",
      "Remove affected leaves",
      "Ensure proper drainage",
      "Space plants adequately"
    ],
    color: "#f59e0b"
  },
  powdery_mildew: {
    name: "Powdery Mildew",
    recommendations: [
      "Apply sulfur-based fungicides",
      "Increase air circulation",
      "Reduce humidity",
      "Remove infected plant parts"
    ],
    color: "#f59e0b"
  },
  rust: {
    name: "Rust Disease",
    recommendations: [
      "Apply rust-specific fungicides",
      "Remove infected leaves",
      "Avoid overhead watering",
      "Improve plant spacing"
    ],
    color: "#ef4444"
  }
};

export interface ScanRecord {
  id: string;
  timestamp: number;
  imageUri: string;
  category: string;
  confidence: number;
  diseaseName: string;
  recommendations: string[];
  userId?: string;
  sessionId?: string;
}

export interface PredictionResult {
  category: string;
  confidence: number;
  diseaseName: string;
  recommendations: string[];
  color: string;
}

class PathoNetClient {
  private model: tf.LayersModel | null = null;
  private isLoaded = false;
  private readonly CLASS_NAMES = [
    'healthy',
    'bacterial_leaf_blight',
    'leaf_spot',
    'powdery_mildew',
    'rust'
  ];

  /**
   * Initialize the PathoNet model
   */
  async loadModel(): Promise<void> {
    try {
      console.log('[PathoNet] Loading ML model...');

      // For now, create a mock model for demonstration
      // In production, load your actual converted TensorFlow.js model
      this.model = tf.sequential({
        layers: [
          tf.layers.flatten({ inputShape: [224, 224, 3] }),
          tf.layers.dense({ units: 128, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: this.CLASS_NAMES.length, activation: 'softmax' })
        ]
      });

      // Initialize with random weights (in production, load trained weights)
      const dummyInput = tf.zeros([1, 224, 224, 3]);
      this.model.predict(dummyInput);
      dummyInput.dispose();

      this.isLoaded = true;
      console.log('[PathoNet] ✅ Model loaded successfully');

    } catch (error) {
      console.error('[PathoNet] ❌ Failed to load model:', error);
      throw new Error('Failed to load ML model');
    }
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.isLoaded && this.model !== null;
  }

  /**
   * Preprocess image for prediction
   */
  private preprocessImage(imageElement: HTMLImageElement | HTMLCanvasElement): tf.Tensor {
    return tf.tidy(() => {
      // Convert to tensor
      const tensor = tf.browser.fromPixels(imageElement);

      // Resize to 224x224 (standard input size for most CNNs)
      const resized = tf.image.resizeBilinear(tensor, [224, 224]);

      // Normalize to [0, 1]
      const normalized = resized.div(255.0);

      // Add batch dimension
      const batched = normalized.expandDims(0);

      return batched;
    });
  }

  /**
   * Validate image quality (simplified version of PathoNetV1.py validation)
   */
  validateImage(imageElement: HTMLImageElement | HTMLCanvasElement): {
    valid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 1.0;

    // Check image size
    if (imageElement.width < 200 || imageElement.height < 200) {
      issues.push("Image too small - minimum 200x200 pixels required");
      score -= 0.3;
    }

    // Check aspect ratio
    const aspectRatio = imageElement.width / imageElement.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      issues.push("Unusual aspect ratio - image may be distorted");
      score -= 0.2;
    }

    return {
      valid: score > 0.5 && issues.length === 0,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Make prediction from image
   */
  async predict(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<PredictionResult> {
    if (!this.isModelLoaded || !this.model) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      console.log('[PathoNet] Starting prediction...');

      // Validate image
      const validation = this.validateImage(imageElement);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.issues.join(', ')}`);
      }

      // Preprocess image
      const preprocessed = this.preprocessImage(imageElement);

      // Make prediction
      const prediction = this.model.predict(preprocessed) as tf.Tensor;

      // Get the predicted class and confidence
      const probabilities = await prediction.data();
      const maxProbability = Math.max(...probabilities);
      const predictedIndex = probabilities.indexOf(maxProbability);

      const predictedClass = this.CLASS_NAMES[predictedIndex];
      const categoryInfo = DISEASE_CATEGORIES[predictedClass as keyof typeof DISEASE_CATEGORIES];

      // Clean up tensors
      preprocessed.dispose();
      prediction.dispose();

      const result: PredictionResult = {
        category: predictedClass,
        confidence: maxProbability,
        diseaseName: categoryInfo.name,
        recommendations: categoryInfo.recommendations,
        color: categoryInfo.color
      };

      console.log('[PathoNet] ✅ Prediction complete:', result);
      return result;

    } catch (error) {
      console.error('[PathoNet] ❌ Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Create scan record from prediction
   */
  createScanRecord(
    imageUri: string,
    prediction: PredictionResult,
    userId?: string,
    sessionId?: string
  ): ScanRecord {
    return {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      imageUri,
      category: prediction.category,
      confidence: prediction.confidence,
      diseaseName: prediction.diseaseName,
      recommendations: prediction.recommendations,
      userId,
      sessionId
    };
  }

  /**
   * Get disease information by category
   */
  getDiseaseInfo(category: string) {
    return DISEASE_CATEGORIES[category as keyof typeof DISEASE_CATEGORIES] || DISEASE_CATEGORIES.healthy;
  }
}

// Export singleton instance
export const pathoNetClient = new PathoNetClient();

// Export types for use in components
export type { PredictionResult, ScanRecord };
