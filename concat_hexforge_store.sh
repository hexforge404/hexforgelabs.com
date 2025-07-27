#!/bin/bash

# Output file name
OUTPUT_FILE="hexforge_store_all_files_combined.txt"

# Directory to scan
TARGET_DIR="."

# Clean output if it exists
rm -f "$OUTPUT_FILE"

# Write a header to the output
echo "📁 All HexForge Store Files Combined" > "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "==========================================" >> "$OUTPUT_FILE"

# Recursively find and append readable files
find "$TARGET_DIR" \
  -type f \
  \( -iname "*.js" -o -iname "*.jsx" -o -iname "*.json" -o -iname "*.env" -o -iname "*.md" -o -iname "*.sh" -o -iname "Dockerfile" -o -iname "*.yml" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" \
  | while read -r file; do
    echo -e "\n\n📄 FILE: $file =========================\n" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
done

echo "✅ Combined file created: $OUTPUT_FILE"
