#!/bin/bash
set -e

echo "🔧 Generating TypeScript types from Rust..."

cd apps/api
cargo test --features ts-rs -- --nocapture || true

echo "✅ Types generated in packages/types/src/generated/"
