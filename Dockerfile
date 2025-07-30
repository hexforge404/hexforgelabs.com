FROM python:3.11-slim

WORKDIR /app
ENV PYTHONPATH=/app

COPY . /app

RUN apt-get update && apt-get install -y \
    docker.io \
    iputils-ping \
    usbutils \
    procps \
    curl \
 && pip install --upgrade pip \
 && pip install --no-cache-dir -r assistant/requirements.txt \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 11435

CMD ["uvicorn", "assistant.main:app", "--host", "0.0.0.0", "--port", "11435"]
