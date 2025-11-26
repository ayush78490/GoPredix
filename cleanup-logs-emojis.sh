#!/bin/bash

# Script to remove console logs and emojis from source files
# Skips backup of build artifacts and node_modules to save space

set -e

FRONTEND_DIR="/home/ayu/Documents/Predection-Market/Frontend"

echo "🧹 Starting cleanup of console logs and emojis..."
echo "⚠️  No backup will be created (use git to revert if needed)"
echo ""

# Counter
total_files=0
modified_files=0
lines_removed_total=0

# Find all TypeScript and JavaScript files (excluding .next and node_modules)
files=$(find "$FRONTEND_DIR" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -type f)

echo "🔍 Found $(echo "$files" | wc -l) files to process"
echo ""

for file in $files; do
  ((total_files++))
  original_size=$(wc -l < "$file")
  
  # Create temp file
  temp_file="${file}.tmp"
  
  # Remove console.log and console.warn statements
  # Keep console.error for production debugging
  sed -E \
    -e '/console\.log\(/d' \
    -e '/console\.warn\(/d' \
    "$file" > "$temp_file"
  
  # Remove emoji characters from strings
  sed -i -E \
    -e 's/[✅❌🔧⚠️🚀📊💰🎯🔍⏳✓✗🌟💡🎉🔒🛠️📝⚡🎨🔥💻📱🌐🎮🏆📈📉💸🎁🔔👍👎🎪🏁🌈⭐🔑🎲🎭🎬🎤🎧🎵🎶🎸🎹🎺🎻🥁]//' \
    "$temp_file"
  
  new_size=$(wc -l < "$temp_file")
  
  # Only replace if file changed
  if ! cmp -s "$file" "$temp_file"; then
    mv "$temp_file" "$file"
    ((modified_files++))
    lines_removed=$((original_size - new_size))
    lines_removed_total=$((lines_removed_total + lines_removed))
    if [ $lines_removed -gt 0 ]; then
      echo "✓ $(basename "$file"): removed $lines_removed lines"
    fi
  else
    rm "$temp_file"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo "   Total files scanned: $total_files"
echo "   Files modified: $modified_files"
echo "   Total lines removed: $lines_removed_total"
echo ""
echo "📝 Changes made:"
echo "   - Removed console.log() statements"
echo "   - Removed console.warn() statements"
echo "   - Removed emoji characters"
echo "   - Kept console.error() for debugging"
echo ""
echo "⚠️  Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Test the application: npm run dev"
echo "   3. If issues occur: git checkout ."
echo ""
