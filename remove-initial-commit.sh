#!/bin/bash
# Automated script to remove the first commit using git rebase

set -e

cd /home/ayu/Documents/Predection-Market

# Set editor to use sed for automation
export GIT_SEQUENCE_EDITOR="sed -i '1s/^pick/drop/'"

echo "🔄 Removing initial commit 7947ebe..."

# Run interactive rebase from root
git rebase -i --root

echo "✅ Initial commit removed!"
echo ""
echo "📝 Verify with: git log --oneline | tail -10"
echo "🚀 Force push with: git push origin main --force"
