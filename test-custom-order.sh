#!/bin/bash

# Test script to simulate custom order submission with logging
echo "=== Testing Custom Order Submission ==="
echo ""

# Create temporary test images (1x1 pixel PNGs)
TEST_IMG1=$(mktemp --suffix=.png)
TEST_IMG2=$(mktemp --suffix=.png)

# Create minimal valid PNG files
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\xe5\x84\xf1\x00\x00\x00\x00IEND\xaeB`\x82' > "$TEST_IMG1"
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\xe5\x84\xf1\x00\x00\x00\x00IEND\xaeB`\x82' > "$TEST_IMG2"

echo "Test images created: $TEST_IMG1, $TEST_IMG2"
echo ""
echo "Submitting double-panel custom order to http://localhost:8000/api/products/custom-orders"
echo ""

# Make the request with exact FormData field names from frontend code
curl -v -X POST http://localhost:8000/api/products/custom-orders \
  -F "productId=test123" \
  -F "productName=Multi-panel Lithophane Lamp" \
  -F "images[]=@$TEST_IMG1" \
  -F "images[]=@$TEST_IMG2" \
  -F "imageOrder[0]=1" \
  -F "imageOrder[1]=2" \
  -F "size=medium" \
  -F "panels=double" \
  -F "lightType=led" \
  -F "notes=Test order"

echo ""
echo ""
echo "=== Test Complete ==="

# Cleanup
rm -f "$TEST_IMG1" "$TEST_IMG2"
