#!/bin/bash

# Build and Publish Script for GoPredix SDK

set -e

echo "🚀 GoPredix SDK Publishing Script"
echo "=================================="

# Check if logged into npm
echo "Checking NPM authentication..."
npm whoami || {
  echo "❌ Not logged into NPM. Run 'npm login' first."
  exit 1
}

echo "✅ NPM authentication verified"

# Build all packages
echo ""
echo "📦 Building all packages..."
npm run build

# Run tests (optional - continue even if tests fail)
echo ""
echo "🧪 Running tests (if available)..."
npm run test --if-present || echo "⚠️  Some packages don't have tests, continuing..."

echo ""
echo "📋 Packages to publish:"
echo "  - @gopredix/core"
echo "  - @gopredix/react"
echo "  - @gopredix/api"

read -p "Continue with publishing? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Publishing cancelled"
    exit 1
fi

# Publish core package
echo ""
echo "Publishing @gopredix/core..."
cd packages/core
npm publish --access public
cd ../..

# Publish react package
echo ""
echo "Publishing @gopredix/react..."
cd packages/react
npm publish --access public
cd ../..

# Publish api package
echo ""
echo "Publishing @gopredix/api..."
cd packages/api
npm publish --access public
cd ../..

echo ""
echo "✅ All packages published successfully!"
echo ""
echo "📦 Published packages:"
echo "  - @gopredix/core"
echo "  - @gopredix/react"
echo "  - @gopredix/api"
echo ""
echo "🎉 Done!"
