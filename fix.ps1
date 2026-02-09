# Fix Frontend & Turbo - Run from project root

Write-Host "🔧 Fixing frontend..." -ForegroundColor Cyan

# Fix 1: Update turbo.json (v2 syntax)
Write-Host "`n1️⃣ Fixing turbo.json..." -ForegroundColor Yellow
@"
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV"],
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "target/**", "build/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
"@ | Out-File "turbo.json" -Encoding UTF8
Write-Host "   ✅ Fixed turbo.json" -ForegroundColor Green

# Fix 2: Downgrade to Tailwind CSS v3 (v4 has breaking changes)
Write-Host "`n2️⃣ Fixing Tailwind CSS..." -ForegroundColor Yellow
@"
{
  "name": "@ttl/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.11",
    "lucide-react": "^0.469.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@typescript-eslint/eslint-plugin": "^8.19.1",
    "@typescript-eslint/parser": "^8.19.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.18.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.9.3",
    "vite": "^6.0.7"
  }
}
"@ | Out-File "apps\web\package.json" -Encoding UTF8
Write-Host "   ✅ Fixed package.json (Tailwind v3)" -ForegroundColor Green

# Fix 3: PostCSS config for Tailwind v3
Write-Host "`n3️⃣ Fixing PostCSS config..." -ForegroundColor Yellow
@"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"@ | Out-File "apps\web\postcss.config.js" -Encoding UTF8
Write-Host "   ✅ Fixed postcss.config.js" -ForegroundColor Green

Write-Host "`n✅ Frontend fixes applied!" -ForegroundColor Green
Write-Host "`nNow run:" -ForegroundColor Cyan
Write-Host "  pnpm install" -ForegroundColor White
Write-Host "  cd apps\web" -ForegroundColor White
Write-Host "  pnpm dev" -ForegroundColor White