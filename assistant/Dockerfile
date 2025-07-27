
# Dockerfile for FastAPI Assistant
FROM python:3.11-slim

# Set working directory to /app/assistant
WORKDIR /app
# Ensure FastAPI can import from /app
ENV PYTHONPATH=/app

# Copy everything into container
COPY . .

# Install dependencies
RUN apt-get update && apt-get install -y \
    docker.io \
    iputils-ping \
    usbutils \
    procps \
    curl \
 && pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get clean && rm -rf /var/lib/apt/lists/*


EXPOSE 11435

# Run FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "11435"]

