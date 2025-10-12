#!/bin/bash
# ======================================================
# HexForge Assistant NGINX Reload & Rollback Script (v3)
# Safe Reload + Auto Chat Check
# ======================================================

set -e
YELLOW="\033[1;33m"; GREEN="\033[0;32m"; RED="\033[0;31m"; NC="\033[0m"
DATE_TAG=$(date +"%Y%m%d-%H%M%S")
TMP_DIR="/tmp/nginx-backup-$DATE_TAG"
BASE="https://assistant.hexforgelabs.com"

# ------------------------------------------------------
# 1️⃣  BACKUP CURRENT CONFIG
# ------------------------------------------------------
echo -e "${YELLOW}📦 Backing up current NGINX configuration...${NC}"
docker exec hexforge-nginx bash -c "mkdir -p $TMP_DIR && cp -r /etc/nginx/conf.d $TMP_DIR/"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✔ Backup saved at ${TMP_DIR}${NC}"
else
  echo -e "${RED}❌ Failed to create backup. Aborting.${NC}"
  exit 1
fi

# ------------------------------------------------------
# 2️⃣  TEST CONFIGURATION
# ------------------------------------------------------
echo -e "${YELLOW}🔍 Testing new NGINX configuration...${NC}"
if docker exec hexforge-nginx nginx -t; then
  echo -e "${GREEN}✅ Syntax OK — reloading safely...${NC}"
  docker exec hexforge-nginx nginx -s reload
  sleep 2
else
  echo -e "${RED}❌ Syntax test failed — restoring backup...${NC}"
  docker exec hexforge-nginx bash -c "rm -rf /etc/nginx/conf.d && cp -r $TMP_DIR/conf.d /etc/nginx/"
  docker exec hexforge-nginx nginx -t && docker exec hexforge-nginx nginx -s reload
  echo -e "${YELLOW}🔁 Reverted to previous working configuration.${NC}"
  exit 1
fi

# ------------------------------------------------------
# 3️⃣  HEALTH & ENDPOINT TESTS
# ------------------------------------------------------
echo -e "${YELLOW}🧪 Running live endpoint checks...${NC}"

function check_endpoint() {
  local label="$1"
  local method="$2"
  local url="$3"
  local data="$4"

  echo -e "\n${YELLOW}→ $label${NC}"
  local output status

  if [ "$method" == "POST" ]; then
    output=$(curl -sk -X POST -H "Content-Type: application/json" -d "$data" "$url" --write-out "%{http_code}" -o /tmp/curlout)
  else
    output=$(curl -sk -X GET "$url" --write-out "%{http_code}" -o /tmp/curlout)
  fi

  status=$output
  body=$(cat /tmp/curlout)

  if [[ "$status" == "200" ]]; then
    echo -e "${GREEN}PASS${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
  elif [[ "$status" == "405" && "$method" == "GET" ]]; then
    echo -e "${YELLOW}⚠️  405 Method Not Allowed — retrying as POST...${NC}"
    output=$(curl -sk -X POST -H "Content-Type: application/json" -d '{"prompt":"HexForge rollback verification"}' "$url" --write-out "%{http_code}" -o /tmp/curlout)
    status=$output
    body=$(cat /tmp/curlout)
    if [[ "$status" == "200" ]]; then
      echo -e "${GREEN}PASS (POST retry)${NC}"
      echo "$body" | jq . 2>/dev/null || echo "$body"
    else
      echo -e "${RED}FAIL (POST retry $status)${NC}"
      echo "$body"
    fi
  else
    echo -e "${RED}FAIL ($status)${NC}"
    echo "$body"
  fi
}

# Run all checks
check_endpoint "/health" "GET" "$BASE/health"
check_endpoint "/mcp/chat" "POST" "$BASE/mcp/chat" '{"prompt":"HexForge rollback verification"}'
check_endpoint "/tool/os-info" "GET" "$BASE/tool/os-info"

# ------------------------------------------------------
# 4️⃣  SHOW NGINX LOGS
# ------------------------------------------------------
echo -e "\n${YELLOW}🧾 Tail of nginx logs (Ctrl+C to stop)...${NC}"
docker logs hexforge-nginx --tail 15
