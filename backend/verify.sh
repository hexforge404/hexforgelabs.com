#!/bin/bash

echo "[1/8] 🔍 Health Check..."
curl -s http://localhost:8000/health | jq

echo ""
echo "[2/8] 🧠 Add Memory Entry (sync-verification)..."
curl -s -X POST http://localhost:8000/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{"tool":"sync-verification","result":"This should land in Notion"}'

echo ""
echo "[3/8] 🧠 Fetch All Memory Entries..."
curl -s http://localhost:8000/api/memory/all | jq

echo ""
echo "[4/8] 📘 Create Knowledge Entry..."
curl -s -X POST http://localhost:8000/api/notion/create-entry \
  -H "Content-Type: application/json" \
  -d '{"title":"Sync Test Note","body":"This entry was created via script.","tags":["test","verify"]}' | jq

echo ""
echo "[5/8] 📎 Attach File to Page (Manual step: verify uploaded file exists)"
echo "❗ Replace PAGE_ID and FILE_PATH below to test manually"
echo "curl -X POST http://localhost:8000/api/notion/attach-file -H 'Content-Type: application/json' -d '{\"pageId\":\"PAGE_ID\",\"filePath\":\"uploads/filename.pdf\"}'"

echo ""
echo "[6/8] 🧪 Test All Notion DB Connections..."
node -e 'require("./utils/notionSync").testNotionConnection()'

echo ""
echo "[7/8] 🧠 Assistant Memory: Add test-entry via API"
curl -s -X POST http://localhost:8000/api/memory/add \
  -H "Content-Type: application/json" \
  -d '{"tool":"test-tool","result":{"message":"This is a test memory entry from script."}}' | jq

echo ""
echo "[8/8] 🧠 Assistant Memory: Query last test-tool"
curl -s http://localhost:8000/api/memory/all | jq '.[] | select(.tool == "test-tool")' | tail -n 5

echo "✅ All basic tests completed. Check your Notion databases for confirmation."
echo "If you see any errors, please check the logs for more details."