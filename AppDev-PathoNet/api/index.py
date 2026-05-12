#!/usr/bin/env python3
"""
Vercel Serverless Function for PathoNet API
"""
import json
import os
from pathlib import Path
from flask import Flask, request, jsonify
from werkzeug.serving import WSGIRequestHandler

# Add the project root to Python path
project_root = Path(__file__).parent.parent
import sys
sys.path.insert(0, str(project_root))

# Initialize Flask app for serverless
app = Flask(__name__)

# Import and configure PathoNet
try:
    from app.components.PathoNetV1 import create_flask_app_v2
    pathonet_app = create_flask_app_v2(weights_path="./models/plantguard_final.pt")
except Exception as e:
    print(f"Error importing PathoNet: {e}")
    pathonet_app = None

@app.route('/health/v2', methods=['GET'])
def health():
    if pathonet_app:
        return jsonify({"status": "healthy", "service": "PathoNet API v2"})
    return jsonify({"error": "PathoNet not initialized"}), 500

@app.route('/predict/v2', methods=['POST'])
def predict():
    if not pathonet_app:
        return jsonify({"error": "PathoNet not initialized"}), 500
    
    try:
        # Forward request to PathoNet app
        with app.test_request_context('/predict/v2', method='POST', 
                                     json=request.get_json(), 
                                     headers=dict(request.headers)):
            response = pathonet_app.full_dispatch_request()
            return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/validate', methods=['POST'])
def validate():
    if not pathonet_app:
        return jsonify({"error": "PathoNet not initialized"}), 500
    
    try:
        with app.test_request_context('/validate', method='POST',
                                     json=request.get_json(),
                                     headers=dict(request.headers)):
            response = pathonet_app.full_dispatch_request()
            return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# CORS handling
@app.after_request
def after_request(response):
    header = response.headers
    header['Access-Control-Allow-Origin'] = '*'
    header['Access-Control-Allow-Headers'] = 'Content-Type'
    header['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# Vercel serverless handler
def handler(request):
    """Vercel serverless function handler"""
    return app(request.environ, lambda status, headers: None)
