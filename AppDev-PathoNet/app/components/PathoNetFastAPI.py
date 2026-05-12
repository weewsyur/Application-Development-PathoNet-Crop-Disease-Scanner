"""
PathoNet FastAPI Server
Modern async API with automatic documentation
Uses existing PathoNet ML logic
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import base64
import io
from PIL import Image
import numpy as np
import torch
from datetime import datetime
import json
import traceback

# Import existing PathoNet logic
try:
    from .PathoNetV1 import predict_ph_v2, validate_scan
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from PathoNetV1 import predict_ph_v2, validate_scan

# Pydantic models for request/response
class PredictionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image string")
    confidence_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum confidence threshold")

class PredictionResponse(BaseModel):
    status: str = Field("success", description="Request status")
    category: str = Field(..., description="Predicted disease category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    disease_name: str = Field(..., description="Human readable disease name")
    recommendations: List[str] = Field(..., description="Treatment recommendations")
    timestamp: str = Field(..., description="Prediction timestamp")

class HealthResponse(BaseModel):
    status: str = Field("healthy", description="API health status")
    version: str = Field("v3.0", description="API version")
    timestamp: str = Field(..., description="Current timestamp")
    endpoints: List[str] = Field(..., description="Available endpoints")
    model_loaded: bool = Field(..., description="Whether ML model is loaded")

class ValidationResult(BaseModel):
    valid: bool = Field(..., description="Whether image is valid for prediction")
    score: float = Field(..., ge=0.0, le=1.0, description="Image quality score")
    issues: List[str] = Field(..., description="Issues found with image")
    recommendations: List[str] = Field(..., description="Improvement recommendations")

# Create FastAPI app
app = FastAPI(
    title="PathoNet Disease Detection API",
    description="Real-time crop disease detection using CNN with FastAPI",
    version="v3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "PathoNet API",
        "description": "Crop Disease Detection Service"
    }
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Firebase domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model status
model_loaded = False

@app.on_event("startup")
async def startup_event():
    """Initialize the API on startup"""
    global model_loaded
    try:
        # Try to load or check model availability
        import torch
        model_loaded = True
        print("✅ FastAPI server started successfully")
    except Exception as e:
        print(f"⚠️  Warning: Model loading issue: {e}")
        model_loaded = False

@app.get("/health/v3", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint with detailed status"""
    return HealthResponse(
        status="healthy",
        version="v3.0",
        timestamp=datetime.utcnow().isoformat(),
        endpoints=[
            "/health/v3",
            "/predict/v3", 
            "/validate",
            "/docs",
            "/redoc"
        ],
        model_loaded=model_loaded
    )

@app.post("/predict/v3", response_model=PredictionResponse, tags=["Prediction"])
async def predict_disease(request: PredictionRequest):
    """
    Predict disease from base64 encoded image
    
    - **image**: Base64 encoded image string (with or without data:image prefix)
    - **confidence_threshold**: Minimum confidence for predictions (0.0-1.0)
    
    Returns detailed prediction with disease information and recommendations.
    """
    try:
        # Clean and decode base64 image
        if "," in request.image:
            # Remove data:image/...;base64, prefix if present
            image_data = base64.b64decode(request.image.split(',')[1])
        else:
            # Direct base64 string
            image_data = base64.b64decode(request.image)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Validate image quality first
        validation_result = validate_scan(image)
        if not validation_result.get('valid', False):
            raise HTTPException(
                status_code=400, 
                detail=f"Image validation failed: {validation_result.get('error', 'Unknown error')}"
            )
        
        # Make prediction using existing PathoNet logic
        result = predict_ph_v2(image, confidence_threshold=request.confidence_threshold)
        
        return PredictionResponse(
            status="success",
            category=result.get('category', 'unknown'),
            confidence=result.get('confidence', 0.0),
            disease_name=result.get('disease_name', 'Unknown Disease'),
            recommendations=result.get('recommendations', []),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = f"Prediction failed: {str(e)}"
        print(f"❌ Prediction error: {error_detail}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

@app.post("/validate", response_model=ValidationResult, tags=["Validation"])
async def validate_image(image: str):
    """
    Validate image quality before prediction
    
    - **image**: Base64 encoded image string
    
    Returns image quality assessment and recommendations.
    """
    try:
        # Clean and decode base64 image
        if "," in image:
            image_data = base64.b64decode(image.split(',')[1])
        else:
            image_data = base64.b64decode(image)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Validate using existing PathoNet logic
        validation_result = validate_scan(pil_image)
        
        return ValidationResult(
            valid=validation_result.get('valid', False),
            score=validation_result.get('score', 0.0),
            issues=validation_result.get('issues', []),
            recommendations=validation_result.get('recommendations', [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "PathoNet Disease Detection API",
        "version": "v3.0",
        "docs": "/docs",
        "health": "/health/v3",
        "status": "running"
    }

# Legacy endpoint compatibility
@app.post("/predict/v2", tags=["Legacy"])
async def predict_v2_compatibility(request: PredictionRequest):
    """Legacy v2 endpoint for backward compatibility"""
    return await predict_disease(request)

@app.get("/health/v2", tags=["Legacy"])
async def health_v2_compatibility():
    """Legacy v2 health endpoint for backward compatibility"""
    health = await health_check()
    return {
        "status": health.status,
        "version": health.version,
        "timestamp": health.timestamp
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PathoNet FastAPI Server...")
    print("📚 Documentation: http://localhost:8000/docs")
    print("🔍 ReDoc: http://localhost:8000/redoc")
    print("💚 Health: http://localhost:8000/health/v3")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    )
