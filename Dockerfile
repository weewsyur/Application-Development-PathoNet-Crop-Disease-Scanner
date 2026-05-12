# PathoNet API Server Dockerfile
# Use Python 3.9 slim image for compatibility
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies for PyTorch and OpenCV
RUN apt-get update && apt-get install -y \
  gcc \
  g++ \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libgomp1 \
  libgthread-2.0-0 \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY AppDev-PathoNet/requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY AppDev-PathoNet/ .

# Create models directory
RUN mkdir -p models

# Expose port (Render uses 10000, local uses 5000)
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health/v2', timeout=5)" || exit 1

# Run the Flask app directly for simpler deployment
CMD ["python", "AppDev-PathoNet/run_api_server.py"]
