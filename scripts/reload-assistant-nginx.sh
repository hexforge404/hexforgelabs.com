#!/bin/bash
# ======================================================
# HexForge Assistant NGINX Reload & Health Verifier
# ======================================================
set -e
YELLOW="\033[1;33m"; GREEN="\033[0;32m"; RED="\033[0;31m"; NC="\033[0m"

echo -e "${YELLOW}🔄 Checking NGINX config inside container...${NC}"
docker exec -it hexforge-nginx nginx -t || { echo -e "${RED}❌ Config test failed.${NC}"; exit 1; }

echo -e "${YELLOW}♻️ Reloading NGINX...${NC}"
docker exec -it hexforge-nginx nginx -s reload
sleep 2

echo -e "${YELLOW}✅ Running quick health & endpoint checks...${NC}"

BASE="https://assistant.hexforgelabs.com"

echo -e "\n${GREEN}→ /health${NC}"
curl -sk "$BASE/health" | jq .

echo -e "\n${GREEN}→ /mcp/chat${NC}"
curl -sk -X POST "$BASE/mcp/chat" -H "Content-Type: application/json" -d '{"prompt":"HexForge NGINX reload check"}' | jq .

echo -e "\n${GREEN}→ /tool/os-info${NC}"
curl -sk "$BASE/tool/os-info" | jq .

echo -e "\n${YELLOW}🌐 Logs tail (Ctrl+C to stop):${NC}"
docker logs hexforge-nginx --tail 10
