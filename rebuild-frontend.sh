#!/bin/bash
echo "🧹 Cleaning previous build..."
rm -rf frontend/build

echo "📦 Rebuilding React app..."
cd frontend
npm run build
cd ..

echo "🚀 Restarting containers..."
docker compose build --no-cache frontend
docker compose down
docker compose up --build -d

