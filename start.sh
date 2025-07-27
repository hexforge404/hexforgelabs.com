#!/bin/bash

echo "📦 Building React frontend..."
cd frontend || exit 1
npm run build || { echo "❌ Frontend build failed"; exit 1; }

cd ..

echo "🧼 Stopping old containers (if any)..."
docker compose down

echo "🐳 Building and starting Docker stack..."
docker compose up --build -d

echo "✅ Full startup complete!"
