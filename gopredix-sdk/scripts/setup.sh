#!/bin/bash

# Development Setup Script

set -e

echo "🔧 Setting up GoPredix SDK development environment"
echo "================================================="

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build packages
echo ""
echo "🏗️  Building packages..."
npm run build

# Setup API environment
echo ""
echo "⚙️  Setting up API environment..."
if [ ! -f packages/api/.env ]; then
  cp packages/api/.env.example packages/api/.env
  echo "✅ Created packages/api/.env"
else
  echo "ℹ️  packages/api/.env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Quick start commands:"
echo "  npm run dev        - Start development mode"
echo "  npm run build      - Build all packages"
echo "  npm run test       - Run tests"
echo ""
echo "📦 To start API server:"
echo "  cd packages/api"
echo "  npm run dev"
echo ""
echo "📚 Documentation: ./docs/"
echo "💡 Examples: ./examples/"
