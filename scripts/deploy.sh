#!/bin/bash
set -e

echo "🚀 Deploying Through Your Letters..."

# Build backend
echo "🦀 Building Rust backend..."
cd apps/api
cargo build --release

# Build frontend
echo "⚛️  Building React frontend..."
cd ../web
pnpm build

echo "✅ Build complete!"
echo "See docs/DEPLOYMENT.md for deployment instructions"
