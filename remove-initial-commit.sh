#!/bin/bash

# Script to remove the initial commit from Git history
# This will rewrite the entire repository history

set -e

echo "🔧 Removing initial commit 7947ebe from Git history..."
echo ""
echo "⚠️  WARNING: This will rewrite the entire repository history!"
echo "⚠️  All commit SHAs will change!"
echo ""

# The commit to remove
COMMIT_TO_REMOVE="7947ebe4495d95338abe2d133e4d7a6b5ec7915c"

# Get the commit right after the one we want to remove
NEXT_COMMIT=$(git log --reverse --oneline | head -2 | tail -1 | awk '{print $1}')

echo "📋 Plan:"
echo "  - Remove commit: $COMMIT_TO_REMOVE (pushing initial repo)"
echo "  - Next commit will become the new root: $NEXT_COMMIT"
echo ""

# Create a backup branch
echo "📦 Creating backup branch..."
git branch backup-before-rebase-$(date +%Y%m%d-%H%M%S)

# Use git filter-branch to remove the commit
echo "🔄 Rewriting history..."

# Since this is the root commit, we need to use a different approach
# We'll create a new orphan branch starting from the second commit
SECOND_COMMIT=$(git rev-list --max-parents=0 HEAD | head -1)
NEXT_COMMIT_FULL=$(git log --reverse --format=%H | sed -n '2p')

echo "Creating new history starting from: $NEXT_COMMIT_FULL"

# Create new orphan branch
git checkout --orphan temp-branch $NEXT_COMMIT_FULL

# Commit this as the new root
git commit -m "$(git log --format=%B -n 1 $NEXT_COMMIT_FULL)"

# Rebase all commits after this onto the new branch
git rebase --onto temp-branch $NEXT_COMMIT_FULL main

# Replace main with the new branch
git branch -M temp-branch main-new
git checkout main
git reset --hard main-new
git branch -D main-new

echo ""
echo "✅ History rewritten successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify the changes: git log --oneline | head -20"
echo "  2. Force push to remote: git push origin main --force"
echo "  3. Team members must re-clone the repository"
echo ""
echo "⚠️  To undo: git checkout backup-before-rebase-*"
echo ""
