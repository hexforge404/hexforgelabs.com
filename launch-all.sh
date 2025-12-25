#!/bin/bash

echo "🧠 Starting full HexForge system..."

# Step 1: Check for .env
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  exit 1
fi
echo "✅ .env file found"

# Step 2: Activate virtual environment
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
  echo "✅ Virtual environment activated"
else
  echo "❌ Virtual environment not found!"
  exit 1
fi

# Step 3: Check and install Python dependencies
echo "🐍 Checking Python modules..."
REQUIRED_MODULES=("requests" "psutil" "python_magic" "GPUtil")
MISSING_MODULES=()

for module in "${REQUIRED_MODULES[@]}"; do
  python -c "import $module" 2>/dev/null || MISSING_MODULES+=("$module")
done

if [ ${#MISSING_MODULES[@]} -ne 0 ]; then
  echo "⚠️  Missing modules detected: ${MISSING_MODULES[*]}"
  echo "📦 Installing missing modules..."
  pip install "${MISSING_MODULES[@]}"
else
  echo "✅ All required Python modules are installed"
fi

# Step 4: Build React frontend
echo "🧱 Building React frontend..."
cd frontend || exit 1
npm run build
cd ..

# Step 5: Restart Docker stack
echo "🔁 Restarting Docker stack..."
docker compose down
docker compose up --build -d

# Step 6: Health check loop for backend
echo "🔍 Verifying backend health..."
for i in {1..5}; do
  HEALTH=$(curl -s --max-time 3 http://127.0.0.1:8000/health | grep ok)
  if [[ "$HEALTH" != "" ]]; then
    echo "✅ Backend is healthy!"
    break
  fi
  echo "⏳ Attempt $i/5: Waiting for backend to respond..."
  sleep 2
done

if [[ "$HEALTH" == "" ]]; then
  echo "⚠️  Health check failed. Backend may not be ready."
fi

echo "🚀 HexForge system launched successfully!"
