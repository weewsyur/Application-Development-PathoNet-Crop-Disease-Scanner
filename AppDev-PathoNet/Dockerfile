FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  gcc \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy entire application for dependency resolution
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory
RUN mkdir -p models

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health/v2', timeout=5)" || exit 1

# Set environment variable for production
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

# Run the Flask server
CMD ["python", "run_api_server.py"]
