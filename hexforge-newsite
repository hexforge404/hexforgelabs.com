#!/bin/bash

# HexForge Labs - Fix Project Permissions Script
# 📂 Replace /path/to/your/project with your actual project root when starting new projects!

TARGET_DIR="/mnt/hdd-storage/hexforge-store"  # 🛑 Placeholder - replace when needed

echo "🔧 Fixing permissions for: $TARGET_DIR"

# Set ownership to devuser:devuser
sudo chown -R devuser:devuser "$TARGET_DIR"

# Set folder permissions to 755
sudo find "$TARGET_DIR" -type d -exec chmod 755 {} \;

# Set file permissions to 644
sudo find "$TARGET_DIR" -type f -exec chmod 644 {} \;

echo "✅ Permissions fixed for $TARGET_DIR!"
