# --------------------------------------------------
# HexForge Assistant Container
# --------------------------------------------------
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Ensure Python can import from /app
ENV PYTHONPATH=/app

# Copy only the assistant folder
COPY ./assistant /app/assistant

# Install system dependencies + Python deps
# Install system dependencies + Python deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        wget \
        iputils-ping \
        usbutils \
        docker.io \
        blender \
        ffmpeg \
        xvfb \
        mesa-utils \
        libgl1-mesa-dri \
        libglu1-mesa \
    && rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/assistant/requirements.txt



# Expose internal port
EXPOSE 11435

# Add a simple healthcheck
HEALTHCHECK CMD curl -f http://localhost:11435/health || exit 1

# Start Assistant via module execution
CMD ["uvicorn", "assistant.main:app", "--host", "0.0.0.0", "--port", "11435"]
