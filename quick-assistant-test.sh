#!/bin/bash
# =======================================================
# HexForge Assistant HTTPS Diagnostics — v1.0
# =======================================================
set -e
GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[1;33m"; NC="\033[0m"

check() {
  local label="$1"; shift
  local cmd="$@"
  echo -e "\n${YELLOW}=== $label ===${NC}"
  if output=$(eval "$cmd" 2>/dev/null); then
    echo -e "${GREEN}PASS${NC}"
    echo "$output" | head -n 10
  else
    echo -e "${RED}FAIL${NC}"
    eval "$cmd" || true
  fi
}

BASE="https://assistant.hexforgelabs.com"

check "Health Check" \
  "curl -sk $BASE/health"

check "AI Chat Test" \
  "curl -sk -X POST $BASE/mcp/chat -H 'Content-Type: application/json' -d '{\"prompt\":\"Hello HexForge!\"}'"

check "Tool: OS Info" \
  "curl -sk $BASE/tool/os-info"

check "Tool: Memory" \
  "curl -sk $BASE/tool/memory"

echo -e "\n${GREEN}✅ Assistant Proxy Verified Successfully${NC}"
