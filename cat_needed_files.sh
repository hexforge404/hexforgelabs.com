#!/bin/bash

echo "📂 Dumping missing HexForge Labs files for ChatGPT support..."

# Frontend component files
cat frontend/src/components/ProductList.js 2>/dev/null
echo -e "\n\n---"

cat frontend/src/components/CartDrawer.js 2>/dev/null
echo -e "\n\n---"

cat frontend/src/components/OrderViewer.js 2>/dev/null
echo -e "\n\n---"

# Pages
cat frontend/src/pages/OrdersPage.jsx 2>/dev/null
echo -e "\n\n---"

# Entry point
cat frontend/src/index.js 2>/dev/null
cat frontend/src/main.jsx 2>/dev/null
echo -e "\n\n---"

# Backend route not yet shown
cat backend/routes/orders.js 2>/dev/null
echo -e "\n\n---"

# Dev config & setup (optional but helpful)
cat docker-compose.yml 2>/dev/null
echo -e "\n\n---"

cat nginx/default.conf 2>/dev/null
echo -e "\n\n---"

cat backend/.env 2>/dev/null | sed 's/=.*/=REDACTED/'  # mask secrets
echo -e "\n\n---"

cat backend/env.example 2>/dev/null
echo -e "\n\n---"

cat README.md 2>/dev/null
echo -e "\n\n---"

echo "✅ Done. All requested files (if found) have been output."
