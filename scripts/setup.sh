#!/bin/bash
set -e

echo "🚀 Setting up Through Your Letters development environment..."

# Check prerequisites
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "❌ Rust/Cargo required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker not found - will skip container setup"; }

echo "✅ Prerequisites check passed"

# Install Node dependencies
echo "📦 Installing Node dependencies..."
pnpm install

# Setup environment files
if [ ! -f apps/api/.env ]; then
    echo "📝 Creating backend .env from template..."
    cp apps/api/.env.example apps/api/.env
    echo "⚠️  Please update apps/api/.env with your credentials"
fi

if [ ! -f apps/web/.env ]; then
    echo "📝 Creating frontend .env from template..."
    cp apps/web/.env.example apps/web/.env
fi

# Start databases
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Starting Docker containers..."
    docker-compose up -d postgres redis
    echo "⏳ Waiting for databases to be ready..."
    sleep 10
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update apps/api/.env with your R2 credentials (see docs/R2_SETUP.md)"
echo "2. Run migrations: cd apps/api && sqlx migrate run"
echo "3. Start backend: cd apps/api && cargo run"
echo "4. Start frontend: cd apps/web && pnpm dev"
