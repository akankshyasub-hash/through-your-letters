#!/bin/bash
set -e

echo "🔍 Checking environment configuration..."

check_file() {
    if [ ! -f "$1" ]; then
        echo "❌ Missing: $1"
        echo "   Create from: $1.example"
        return 1
    else
        echo "✅ Found: $1"
        return 0
    fi
}

MISSING=0

check_file "apps/api/.env" || MISSING=1
check_file "apps/web/.env" || MISSING=1

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "⚠️  Missing .env files!"
    echo "Run: cp apps/api/.env.example apps/api/.env"
    echo "Then update with your credentials."
    exit 1
fi

echo ""
echo "✅ All .env files present"
