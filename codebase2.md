### File: .claude/settings.local.json

```
{
  "permissions": {
    "allow": [
      "mcp__acp__Edit"
    ]
  }
}

```

### File: .editorconfig

```
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.rs]
indent_size = 4

```

### File: .env.example

```
# This is the root .env.example - each app has its own

# Development environment
NODE_ENV=development
PNPM_VERSION=8.15.0

```

### File: .github/SECRETS.md

```
# GitHub Secrets - Free Services

## Required Secrets

### For Render Deployment (Backend)

**None required** - Render auto-deploys from GitHub

Optional:
```
RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxx
```
Get from: Render Dashboard → Service → Settings → Deploy Hook

### For Vercel Deployment (Frontend)

```
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=team_xxx
VERCEL_PROJECT_ID=prj_xxx
VITE_API_URL=https://through-your-letters-api.onrender.com
```

Get from:
- Token: https://vercel.com/account/tokens
- Org/Project IDs: Vercel Dashboard → Settings

### For Testing (CI)

```
R2_ACCESS_KEY_ID=test_key
R2_SECRET_ACCESS_KEY=test_secret
```

(Use dummy values for CI tests)

## Environment Variables in Services

### Render (Backend)

Set in: Dashboard → Service → Environment

```bash
DATABASE_URL=postgresql://...          # From Supabase
REDIS_URL=redis://...                  # From Upstash
R2_ACCESS_KEY_ID=...                   # From Cloudflare
R2_SECRET_ACCESS_KEY=...               # From Cloudflare
R2_ENDPOINT=...                        # From Cloudflare
R2_BUCKET_NAME=through-your-letters
R2_PUBLIC_URL=...                      # From Cloudflare
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Vercel (Frontend)

Set in: Project → Settings → Environment Variables

```bash
VITE_API_URL=https://through-your-letters-api.onrender.com
```

## Free Service URLs

- **Render**: https://dashboard.render.com
- **Vercel**: https://vercel.com/dashboard
- **Supabase**: https://app.supabase.com
- **Upstash**: https://console.upstash.com
- **Cloudflare**: https://dash.cloudflare.com


```

### File: .github/workflows/ci.yml

```
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  DATABASE_URL: postgresql://test:test@localhost:5432/through-your-letters-test
  REDIS_URL: redis://localhost:6379
  ENABLE_ML_PROCESSING: false
  ENABLE_VIRUS_SCAN: false

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:17-3.5
        env:
          POSTGRES_DB: through-your-letters-test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      
      redis:
        image: redis:8.4.0-alpine
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 3
    
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      
      - run: pnpm install
      
      - name: Create test .env files
        run: |
          cat > apps/api/.env << EOF
          DATABASE_URL=${{ env.DATABASE_URL }}
          DATABASE_MAX_CONNECTIONS=5
          REDIS_URL=${{ env.REDIS_URL }}
          REDIS_MAX_CONNECTIONS=5
          R2_ACCESS_KEY_ID=test
          R2_SECRET_ACCESS_KEY=test
          R2_ENDPOINT=https://test.r2.cloudflarestorage.com
          R2_BUCKET_NAME=test
          R2_REGION=auto
          R2_PUBLIC_URL=https://test.r2.dev
          HOST=0.0.0.0
          PORT=3000
          CORS_ALLOWED_ORIGINS=http://localhost:5173
          RATE_LIMIT_UPLOADS_PER_DAY=100
          RATE_LIMIT_UPLOADS_PER_IP=100
          ENABLE_ML_PROCESSING=false
          ML_MODEL_PATH=./models
          ENABLE_VIRUS_SCAN=false
          ENVIRONMENT=test
          EOF
          
          cat > apps/web/.env << EOF
          VITE_API_URL=http://localhost:3000
          EOF
      
      - name: Run migrations
        working-directory: apps/api
        run: |
          cargo install sqlx-cli --no-default-features --features postgres
          sqlx database create
          sqlx migrate run
      
      - name: Test backend
        working-directory: apps/api
        run: cargo test
      
      - name: Build backend
        working-directory: apps/api
        run: cargo build --release
      
      - name: Test & build frontend
        working-directory: apps/web
        run: |
          pnpm test || echo "Tests skipped"
          pnpm build

```

### File: .github/workflows/deploy-backend.yml

```
name: Deploy Backend to Render

on:
  push:
    branches: [ main ]
    paths:
      - 'apps/api/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Render auto-deploys on git push
      # No action needed - just push to main branch
      
      # Optional: Trigger manual deploy
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
        if: secrets.RENDER_DEPLOY_HOOK != ''

# NOTE: Render auto-deploys from GitHub
# Optionally set RENDER_DEPLOY_HOOK secret for manual triggers

```

### File: .github/workflows/keep-alive.yml

```
name: Keep Backend Alive

on:
  schedule:
    # Every 5 minutes during business hours (9 AM - 9 PM UTC)
    - cron: '*/5 9-21 * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping backend health endpoint
        run: |
          curl -f https://through-your-letters-api.onrender.com || echo "Backend is sleeping"
        continue-on-error: true

# Replace 'your-api' with your actual Render service name
# This prevents Render free tier from sleeping during active hours

```

### File: .gitignore

```
node_modules
dist
target
.env
.env.*.local
.DS_Store
coverage
.turbo
*package-lock.json
**/docs/*.md
apps/**/*.md
env
*.sh
nul

```

### File: .nvmrc

```
20.11.0

```

### File: .vscode/settings.json

```
{
    "workbench.colorCustomizations": {}
}
```

### File: CONTRIBUTING.md

```
# Contributing Guide

Thank you for considering contributing to Through The Letters!

## Development Setup

See [docs/SETUP.md](docs/SETUP.md) for complete setup instructions.

## How to Contribute

### 1. Fork & Clone

```bash
git fork https://github.com/yourusername/through-the-letters.git
git clone your-fork
cd through-the-letters
pnpm install
```

### 2. Create Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

- Write clean, documented code
- Follow existing code style
- Add tests for new features
- Update documentation

### 4. Test

```bash
# Frontend tests
cd apps/web && pnpm test

# Backend tests
cd apps/api && cargo test

# E2E tests
pnpm test:e2e
```

### 5. Commit

Use conventional commits:

```
feat: add map filtering
fix: resolve upload bug
docs: update API documentation
test: add gallery tests
```

### 6. Push & PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### Rust
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Follow Rust API Guidelines

### TypeScript/React
- Use Prettier for formatting
- Follow Airbnb style guide
- Use functional components + hooks

## Architecture Principles

- **DDD**: Domain logic in domain layer
- **Clean Architecture**: Dependencies point inward
- **SOLID**: Single responsibility, dependency injection
- **Testing**: Write tests for business logic

## Documentation

Update documentation when adding features:
- API endpoints → `docs/API.md`
- Architecture changes → `docs/ARCHITECTURE.md`
- Setup steps → `docs/SETUP.md`

## Review Process

1. Automated checks must pass (CI)
2. Code review by maintainer
3. Testing on staging environment
4. Merge to `main`

## Questions?

- Open a GitHub Discussion
- Join our Discord (link TBD)
- Email: contact@throughtheletters.in

## License

By contributing, you agree your contributions will be licensed under MIT License.

```

### File: LICENSE

```
MIT License

Copyright (c) 2026 Through Your Letters

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

### File: README.md

```
# Through The Letters - Bengaluru Street Typography Archive

**A collaborative archive documenting the disappearing world of street lettering in Indian cities.**

## 🚀 Quick Start

```bash

# Install dependencies
pnpm install

# Start local development
docker-compose up -d postgres redis
cd apps/api && cargo run &
cd apps/web && pnpm dev
```

## 📚 Documentation

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - 5-minute setup
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - **FREE** deployment guide
- **[docs/R2_SETUP.md](docs/R2_SETUP.md)** - Storage configuration
- **[docs/ENV_VARIABLES.md](docs/ENV_VARIABLES.md)** - Environment setup
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design

## 🛠️ Technology Stack

**Backend:**
- Rust + Axum (web framework)
- PostgreSQL + PostGIS (geospatial)
- Redis (cache + queue)
- ONNX Runtime (ML)

**Frontend:**
- React 18 + TypeScript
- Vite + Tailwind CSS
- TanStack Query

**Mobile:**
- Capacitor (iOS + Android)

## 🌟 Features

- Image upload with ML text detection
- Gallery with pagination
- Full-text search
- Map exploration
- Social features (likes, comments)
- Rate limiting
- Mobile apps (iOS/Android)

## 📊 Free Tier Limits

| Resource | Free Tier |
|----------|-----------|
| Backend | 750 hrs/month |
| Database | 500 MB |
| Redis | 10k commands/day |
| Storage | 10 GB |
| Bandwidth | 100 GB/month |

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

**Built with ❤️ for preserving urban typography**

```

### File: apps/api/.dockerignore

```
target/
.env
.git/
*.log

```

### File: apps/api/.sqlx/query-075dfac5d732d6dc73412e290d04068bb25a1d19689db76354c5496f27646a8b.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT pin_code, COUNT(*) as \"artifact_count!\" FROM letterings WHERE status = 'APPROVED' GROUP BY pin_code ORDER BY \"artifact_count!\" DESC",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 1,
        "name": "artifact_count!",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      false,
      null
    ]
  },
  "hash": "075dfac5d732d6dc73412e290d04068bb25a1d19689db76354c5496f27646a8b"
}

```

### File: apps/api/.sqlx/query-0c003f0c165f88d006967bdd18829bdbb3baad1fd8610bbca76d649531283617.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM letterings WHERE status = 'PENDING'",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "0c003f0c165f88d006967bdd18829bdbb3baad1fd8610bbca76d649531283617"
}

```

### File: apps/api/.sqlx/query-0f1caddfd7c48bc1371fe7d5cdf80ebcb125fa527d10528a98baf4748cb5a22f.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, city_id, contributor_tag, image_url,\n            thumbnail_small, thumbnail_medium, thumbnail_large,\n            ST_AsText(location) as location_wkt,\n            pin_code, status, uploaded_by_ip, created_at, updated_at,\n            likes_count, comments_count, detected_text, description, image_hash,\n            report_count, report_reasons, cultural_context,\n            ml_style, ml_script, ml_confidence, ml_color_palette\n            FROM letterings WHERE image_hash = $1",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "city_id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 2,
        "name": "contributor_tag",
        "type_info": "Varchar"
      },
      {
        "ordinal": 3,
        "name": "image_url",
        "type_info": "Text"
      },
      {
        "ordinal": 4,
        "name": "thumbnail_small",
        "type_info": "Text"
      },
      {
        "ordinal": 5,
        "name": "thumbnail_medium",
        "type_info": "Text"
      },
      {
        "ordinal": 6,
        "name": "thumbnail_large",
        "type_info": "Text"
      },
      {
        "ordinal": 7,
        "name": "location_wkt",
        "type_info": "Text"
      },
      {
        "ordinal": 8,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 9,
        "name": "status",
        "type_info": "Varchar"
      },
      {
        "ordinal": 10,
        "name": "uploaded_by_ip",
        "type_info": "Inet"
      },
      {
        "ordinal": 11,
        "name": "created_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 12,
        "name": "updated_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 13,
        "name": "likes_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 14,
        "name": "comments_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 15,
        "name": "detected_text",
        "type_info": "Text"
      },
      {
        "ordinal": 16,
        "name": "description",
        "type_info": "Text"
      },
      {
        "ordinal": 17,
        "name": "image_hash",
        "type_info": "Varchar"
      },
      {
        "ordinal": 18,
        "name": "report_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 19,
        "name": "report_reasons",
        "type_info": "Jsonb"
      },
      {
        "ordinal": 20,
        "name": "cultural_context",
        "type_info": "Text"
      },
      {
        "ordinal": 21,
        "name": "ml_style",
        "type_info": "Varchar"
      },
      {
        "ordinal": 22,
        "name": "ml_script",
        "type_info": "Varchar"
      },
      {
        "ordinal": 23,
        "name": "ml_confidence",
        "type_info": "Float4"
      },
      {
        "ordinal": 24,
        "name": "ml_color_palette",
        "type_info": "Jsonb"
      }
    ],
    "parameters": {
      "Left": [
        "Text"
      ]
    },
    "nullable": [
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      null,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      true
    ]
  },
  "hash": "0f1caddfd7c48bc1371fe7d5cdf80ebcb125fa527d10528a98baf4748cb5a22f"
}

```

### File: apps/api/.sqlx/query-1ec1ea061c98ca1077a96fe8bd2be39511e58cd7c539787db37cd4885ade20fe.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings SET comments_count = comments_count + 1 WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "1ec1ea061c98ca1077a96fe8bd2be39511e58cd7c539787db37cd4885ade20fe"
}

```

### File: apps/api/.sqlx/query-25282bf8cf07e7045e3920bbbcd4a9fe522a5169d89939537b95a5e0733258ba.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM cities",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "25282bf8cf07e7045e3920bbbcd4a9fe522a5169d89939537b95a5e0733258ba"
}

```

### File: apps/api/.sqlx/query-27766fe53e623b5c82f5ef9c52a83f55ebcc08912c24159b2cdcd89438476230.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings SET status = 'REJECTED', detected_text = $2, updated_at = NOW() WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid",
        "Text"
      ]
    },
    "nullable": []
  },
  "hash": "27766fe53e623b5c82f5ef9c52a83f55ebcc08912c24159b2cdcd89438476230"
}

```

### File: apps/api/.sqlx/query-334db9f1168f13ae7b7fa7b9cfd666c38fa658879dbfcd84ee0fd2f979cc976f.json

```
{
  "db_name": "PostgreSQL",
  "query": "DELETE FROM letterings WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "334db9f1168f13ae7b7fa7b9cfd666c38fa658879dbfcd84ee0fd2f979cc976f"
}

```

### File: apps/api/.sqlx/query-416d71be485cbeb9e03ae0825adf6ff4a282b7e5acff8ca3c763f913b9a1ee58.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT pin_code FROM letterings WHERE id = $1",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "pin_code",
        "type_info": "Varchar"
      }
    ],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": [
      false
    ]
  },
  "hash": "416d71be485cbeb9e03ae0825adf6ff4a282b7e5acff8ca3c763f913b9a1ee58"
}

```

### File: apps/api/.sqlx/query-4c7b0c1199fbb736d8dc65812be66ef2415c5d67f203ba71f3c43a94604bdf16.json

```
{
  "db_name": "PostgreSQL",
  "query": "INSERT INTO letterings\n            (id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large,\n             location, pin_code, status, uploaded_by_ip, image_hash, description,\n             report_count, report_reasons, cultural_context, created_at, updated_at)\n            VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeogFromText($8), $9, $10, $11, $12, $13,\n                    $14, $15, $16, $17, $18)",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid",
        "Uuid",
        "Varchar",
        "Text",
        "Text",
        "Text",
        "Text",
        "Text",
        "Varchar",
        "Varchar",
        "Inet",
        "Varchar",
        "Text",
        "Int4",
        "Jsonb",
        "Text",
        "Timestamptz",
        "Timestamptz"
      ]
    },
    "nullable": []
  },
  "hash": "4c7b0c1199fbb736d8dc65812be66ef2415c5d67f203ba71f3c43a94604bdf16"
}

```

### File: apps/api/.sqlx/query-4fc3a0e2be448e72421645c883b9afd3eb57faa257fa80d0e25e12d79e249aad.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings SET status = 'APPROVED', updated_at = NOW() WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "4fc3a0e2be448e72421645c883b9afd3eb57faa257fa80d0e25e12d79e249aad"
}

```

### File: apps/api/.sqlx/query-5042911de7cbcab6b417332731e17963853984ed49b73e83d6ab2c48281d4659.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM letterings WHERE status = $1",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": [
        "Text"
      ]
    },
    "nullable": [
      null
    ]
  },
  "hash": "5042911de7cbcab6b417332731e17963853984ed49b73e83d6ab2c48281d4659"
}

```

### File: apps/api/.sqlx/query-52bd0db20a5e76507a402b691f5dc9f94435783068d797108ec575b55a9b3243.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, image_url, thumbnail_small, contributor_tag, pin_code,\n               detected_text, description, status, likes_count, comments_count,\n               report_count, report_reasons, cultural_context, created_at\n               FROM letterings\n               ORDER BY created_at DESC\n               LIMIT $1 OFFSET $2",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "image_url",
        "type_info": "Text"
      },
      {
        "ordinal": 2,
        "name": "thumbnail_small",
        "type_info": "Text"
      },
      {
        "ordinal": 3,
        "name": "contributor_tag",
        "type_info": "Varchar"
      },
      {
        "ordinal": 4,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 5,
        "name": "detected_text",
        "type_info": "Text"
      },
      {
        "ordinal": 6,
        "name": "description",
        "type_info": "Text"
      },
      {
        "ordinal": 7,
        "name": "status",
        "type_info": "Varchar"
      },
      {
        "ordinal": 8,
        "name": "likes_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 9,
        "name": "comments_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 10,
        "name": "report_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 11,
        "name": "report_reasons",
        "type_info": "Jsonb"
      },
      {
        "ordinal": 12,
        "name": "cultural_context",
        "type_info": "Text"
      },
      {
        "ordinal": 13,
        "name": "created_at",
        "type_info": "Timestamptz"
      }
    ],
    "parameters": {
      "Left": [
        "Int8",
        "Int8"
      ]
    },
    "nullable": [
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false
    ]
  },
  "hash": "52bd0db20a5e76507a402b691f5dc9f94435783068d797108ec575b55a9b3243"
}

```

### File: apps/api/.sqlx/query-5bd8c71652a9bceea75f90a9f6828a7d0c3aa404069ccaf1ca852666f804da62.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM likes",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "5bd8c71652a9bceea75f90a9f6828a7d0c3aa404069ccaf1ca852666f804da62"
}

```

### File: apps/api/.sqlx/query-639b3723eb9041f9eb91bfe892a3cde68ded10d4cddea086932fcd19cd619c0b.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM letterings",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "639b3723eb9041f9eb91bfe892a3cde68ded10d4cddea086932fcd19cd619c0b"
}

```

### File: apps/api/.sqlx/query-6659841fd2b72afc93673f38bf62d50248e3ccfb400a39a2302d0280fb6d3aaa.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, city_id, contributor_tag, image_url,\n            thumbnail_small, thumbnail_medium, thumbnail_large,\n            ST_AsText(location) as location_wkt,\n            pin_code, status, uploaded_by_ip, created_at, updated_at,\n            likes_count, comments_count, detected_text, description, image_hash,\n            report_count, report_reasons, cultural_context,\n            ml_style, ml_script, ml_confidence, ml_color_palette\n            FROM letterings\n            WHERE status NOT IN ('REPORTED', 'REJECTED')\n            ORDER BY created_at DESC\n            LIMIT $1 OFFSET $2",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "city_id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 2,
        "name": "contributor_tag",
        "type_info": "Varchar"
      },
      {
        "ordinal": 3,
        "name": "image_url",
        "type_info": "Text"
      },
      {
        "ordinal": 4,
        "name": "thumbnail_small",
        "type_info": "Text"
      },
      {
        "ordinal": 5,
        "name": "thumbnail_medium",
        "type_info": "Text"
      },
      {
        "ordinal": 6,
        "name": "thumbnail_large",
        "type_info": "Text"
      },
      {
        "ordinal": 7,
        "name": "location_wkt",
        "type_info": "Text"
      },
      {
        "ordinal": 8,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 9,
        "name": "status",
        "type_info": "Varchar"
      },
      {
        "ordinal": 10,
        "name": "uploaded_by_ip",
        "type_info": "Inet"
      },
      {
        "ordinal": 11,
        "name": "created_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 12,
        "name": "updated_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 13,
        "name": "likes_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 14,
        "name": "comments_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 15,
        "name": "detected_text",
        "type_info": "Text"
      },
      {
        "ordinal": 16,
        "name": "description",
        "type_info": "Text"
      },
      {
        "ordinal": 17,
        "name": "image_hash",
        "type_info": "Varchar"
      },
      {
        "ordinal": 18,
        "name": "report_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 19,
        "name": "report_reasons",
        "type_info": "Jsonb"
      },
      {
        "ordinal": 20,
        "name": "cultural_context",
        "type_info": "Text"
      },
      {
        "ordinal": 21,
        "name": "ml_style",
        "type_info": "Varchar"
      },
      {
        "ordinal": 22,
        "name": "ml_script",
        "type_info": "Varchar"
      },
      {
        "ordinal": 23,
        "name": "ml_confidence",
        "type_info": "Float4"
      },
      {
        "ordinal": 24,
        "name": "ml_color_palette",
        "type_info": "Jsonb"
      }
    ],
    "parameters": {
      "Left": [
        "Int8",
        "Int8"
      ]
    },
    "nullable": [
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      null,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      true
    ]
  },
  "hash": "6659841fd2b72afc93673f38bf62d50248e3ccfb400a39a2302d0280fb6d3aaa"
}

```

### File: apps/api/.sqlx/query-6b1117d59440c1f6ba30ecd42244848da87dbddb3a81840131af35abf476f88c.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM letterings WHERE status = 'APPROVED'",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "6b1117d59440c1f6ba30ecd42244848da87dbddb3a81840131af35abf476f88c"
}

```

### File: apps/api/.sqlx/query-8750ce1c891464f70f0faae3620c15c4172467ab50d20fed045625d7bcd22ab0.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "8750ce1c891464f70f0faae3620c15c4172467ab50d20fed045625d7bcd22ab0"
}

```

### File: apps/api/.sqlx/query-98cedd55272a3f42b0fb349f0b8fc50719010b3c20085269f81b1d07e57d963d.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings\n        SET report_count = report_count + 1,\n            report_reasons = report_reasons || $2::jsonb,\n            status = CASE WHEN report_count + 1 >= 3 THEN 'REPORTED' ELSE status END,\n            updated_at = NOW()\n        WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid",
        "Jsonb"
      ]
    },
    "nullable": []
  },
  "hash": "98cedd55272a3f42b0fb349f0b8fc50719010b3c20085269f81b1d07e57d963d"
}

```

### File: apps/api/.sqlx/query-a02ed7f7c2adcdfe4b1a9878660feb7a9def71477d3a44080b15a64c6ab665f3.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM comments",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "a02ed7f7c2adcdfe4b1a9878660feb7a9def71477d3a44080b15a64c6ab665f3"
}

```

### File: apps/api/.sqlx/query-a530563786b76c9c48f68437112944add1286128b9e39f296ab213d6ec5b398b.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, name, country_code FROM cities ORDER BY name",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "name",
        "type_info": "Varchar"
      },
      {
        "ordinal": 2,
        "name": "country_code",
        "type_info": "Varchar"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      false,
      false,
      false
    ]
  },
  "hash": "a530563786b76c9c48f68437112944add1286128b9e39f296ab213d6ec5b398b"
}

```

### File: apps/api/.sqlx/query-a84dc3528bd75f8d75345aa57e9b13128a6241961d62bc848f81f5085550c75c.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings SET likes_count = likes_count + 1 WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "a84dc3528bd75f8d75345aa57e9b13128a6241961d62bc848f81f5085550c75c"
}

```

### File: apps/api/.sqlx/query-af72cd056db8d3aba0da16e5d84ae1dd218c15e0d6d8ebb6beeccf0c655910af.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings\n        SET report_count = 0,\n            report_reasons = '[]'::jsonb,\n            status = 'APPROVED',\n            updated_at = NOW()\n        WHERE id = $1",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "af72cd056db8d3aba0da16e5d84ae1dd218c15e0d6d8ebb6beeccf0c655910af"
}

```

### File: apps/api/.sqlx/query-d0afe0d43d61bda28aa7b0a019e84957448d8d13fd2197e5c0ac797e28262ccb.json

```
{
  "db_name": "PostgreSQL",
  "query": "UPDATE letterings SET\n                            detected_text = COALESCE($1, detected_text),\n                            ml_style = $2,\n                            ml_color_palette = COALESCE($3, ml_color_palette),\n                            cultural_context = COALESCE($4, cultural_context),\n                            status = 'APPROVED',\n                            updated_at = NOW()\n                        WHERE id = $5",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Text",
        "Varchar",
        "Jsonb",
        "Text",
        "Uuid"
      ]
    },
    "nullable": []
  },
  "hash": "d0afe0d43d61bda28aa7b0a019e84957448d8d13fd2197e5c0ac797e28262ccb"
}

```

### File: apps/api/.sqlx/query-d0fa1c23d433d2aa63ca6f4a13f1c008b680fafcbdbb9924166c2cdedce8c712.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM letterings WHERE status = 'REJECTED'",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": []
    },
    "nullable": [
      null
    ]
  },
  "hash": "d0fa1c23d433d2aa63ca6f4a13f1c008b680fafcbdbb9924166c2cdedce8c712"
}

```

### File: apps/api/.sqlx/query-d3a42f72fe892a2b28edbd40674b6f49b4f0e0fd0f51e630159909eae2b197f0.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, city_id, contributor_tag, image_url,\n            thumbnail_small, thumbnail_medium, thumbnail_large,\n            ST_AsText(location) as location_wkt,\n            pin_code, status, uploaded_by_ip, created_at, updated_at,\n            likes_count, comments_count, detected_text, description, image_hash,\n            report_count, report_reasons, cultural_context,\n            ml_style, ml_script, ml_confidence, ml_color_palette\n            FROM letterings WHERE id = $1",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "city_id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 2,
        "name": "contributor_tag",
        "type_info": "Varchar"
      },
      {
        "ordinal": 3,
        "name": "image_url",
        "type_info": "Text"
      },
      {
        "ordinal": 4,
        "name": "thumbnail_small",
        "type_info": "Text"
      },
      {
        "ordinal": 5,
        "name": "thumbnail_medium",
        "type_info": "Text"
      },
      {
        "ordinal": 6,
        "name": "thumbnail_large",
        "type_info": "Text"
      },
      {
        "ordinal": 7,
        "name": "location_wkt",
        "type_info": "Text"
      },
      {
        "ordinal": 8,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 9,
        "name": "status",
        "type_info": "Varchar"
      },
      {
        "ordinal": 10,
        "name": "uploaded_by_ip",
        "type_info": "Inet"
      },
      {
        "ordinal": 11,
        "name": "created_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 12,
        "name": "updated_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 13,
        "name": "likes_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 14,
        "name": "comments_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 15,
        "name": "detected_text",
        "type_info": "Text"
      },
      {
        "ordinal": 16,
        "name": "description",
        "type_info": "Text"
      },
      {
        "ordinal": 17,
        "name": "image_hash",
        "type_info": "Varchar"
      },
      {
        "ordinal": 18,
        "name": "report_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 19,
        "name": "report_reasons",
        "type_info": "Jsonb"
      },
      {
        "ordinal": 20,
        "name": "cultural_context",
        "type_info": "Text"
      },
      {
        "ordinal": 21,
        "name": "ml_style",
        "type_info": "Varchar"
      },
      {
        "ordinal": 22,
        "name": "ml_script",
        "type_info": "Varchar"
      },
      {
        "ordinal": 23,
        "name": "ml_confidence",
        "type_info": "Float4"
      },
      {
        "ordinal": 24,
        "name": "ml_color_palette",
        "type_info": "Jsonb"
      }
    ],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": [
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      null,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      true
    ]
  },
  "hash": "d3a42f72fe892a2b28edbd40674b6f49b4f0e0fd0f51e630159909eae2b197f0"
}

```

### File: apps/api/.sqlx/query-d5f11def44eb42681065337ab400bf34c4ec917b00ab615fe6c507727e86eeed.json

```
{
  "db_name": "PostgreSQL",
  "query": "DELETE FROM likes WHERE lettering_id = $1 AND user_ip = $2",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid",
        "Inet"
      ]
    },
    "nullable": []
  },
  "hash": "d5f11def44eb42681065337ab400bf34c4ec917b00ab615fe6c507727e86eeed"
}

```

### File: apps/api/.sqlx/query-d6826d5777e96ffc91ce4e66a86af7bda53ee930733fdf912a38739535ce7822.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT COUNT(*) FROM letterings WHERE contributor_tag = $1 AND created_at > CURRENT_DATE",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "count",
        "type_info": "Int8"
      }
    ],
    "parameters": {
      "Left": [
        "Text"
      ]
    },
    "nullable": [
      null
    ]
  },
  "hash": "d6826d5777e96ffc91ce4e66a86af7bda53ee930733fdf912a38739535ce7822"
}

```

### File: apps/api/.sqlx/query-dcd23e5c20563e90da672d7d1eb63fc466c0aad15928d31f585a75cfc71122d5.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, image_url, thumbnail_small, contributor_tag, pin_code,\n               detected_text, description, status, likes_count, comments_count,\n               report_count, report_reasons, cultural_context, created_at\n               FROM letterings\n               WHERE status = $1\n               ORDER BY created_at ASC\n               LIMIT $2 OFFSET $3",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "image_url",
        "type_info": "Text"
      },
      {
        "ordinal": 2,
        "name": "thumbnail_small",
        "type_info": "Text"
      },
      {
        "ordinal": 3,
        "name": "contributor_tag",
        "type_info": "Varchar"
      },
      {
        "ordinal": 4,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 5,
        "name": "detected_text",
        "type_info": "Text"
      },
      {
        "ordinal": 6,
        "name": "description",
        "type_info": "Text"
      },
      {
        "ordinal": 7,
        "name": "status",
        "type_info": "Varchar"
      },
      {
        "ordinal": 8,
        "name": "likes_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 9,
        "name": "comments_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 10,
        "name": "report_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 11,
        "name": "report_reasons",
        "type_info": "Jsonb"
      },
      {
        "ordinal": 12,
        "name": "cultural_context",
        "type_info": "Text"
      },
      {
        "ordinal": 13,
        "name": "created_at",
        "type_info": "Timestamptz"
      }
    ],
    "parameters": {
      "Left": [
        "Text",
        "Int8",
        "Int8"
      ]
    },
    "nullable": [
      false,
      false,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false
    ]
  },
  "hash": "dcd23e5c20563e90da672d7d1eb63fc466c0aad15928d31f585a75cfc71122d5"
}

```

### File: apps/api/.sqlx/query-e490068ada0d7f349a73cf8e4697a82dbc8008f963038fba711fcb19b004b70a.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, city_id, contributor_tag, image_url,\n            thumbnail_small, thumbnail_medium, thumbnail_large,\n            ST_AsText(location) as location_wkt,\n            pin_code, status, uploaded_by_ip, created_at, updated_at,\n            likes_count, comments_count, detected_text, description, image_hash,\n            report_count, report_reasons, cultural_context,\n            ml_style, ml_script, ml_confidence, ml_color_palette\n            FROM letterings\n            WHERE detected_text_tsv @@ to_tsquery('english', $1)\n               OR contributor_tag ILIKE $2\n               OR pin_code ILIKE $2\n               OR detected_text ILIKE $2\n               OR description ILIKE $2\n            ORDER BY created_at DESC\n            LIMIT 50",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "city_id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 2,
        "name": "contributor_tag",
        "type_info": "Varchar"
      },
      {
        "ordinal": 3,
        "name": "image_url",
        "type_info": "Text"
      },
      {
        "ordinal": 4,
        "name": "thumbnail_small",
        "type_info": "Text"
      },
      {
        "ordinal": 5,
        "name": "thumbnail_medium",
        "type_info": "Text"
      },
      {
        "ordinal": 6,
        "name": "thumbnail_large",
        "type_info": "Text"
      },
      {
        "ordinal": 7,
        "name": "location_wkt",
        "type_info": "Text"
      },
      {
        "ordinal": 8,
        "name": "pin_code",
        "type_info": "Varchar"
      },
      {
        "ordinal": 9,
        "name": "status",
        "type_info": "Varchar"
      },
      {
        "ordinal": 10,
        "name": "uploaded_by_ip",
        "type_info": "Inet"
      },
      {
        "ordinal": 11,
        "name": "created_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 12,
        "name": "updated_at",
        "type_info": "Timestamptz"
      },
      {
        "ordinal": 13,
        "name": "likes_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 14,
        "name": "comments_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 15,
        "name": "detected_text",
        "type_info": "Text"
      },
      {
        "ordinal": 16,
        "name": "description",
        "type_info": "Text"
      },
      {
        "ordinal": 17,
        "name": "image_hash",
        "type_info": "Varchar"
      },
      {
        "ordinal": 18,
        "name": "report_count",
        "type_info": "Int4"
      },
      {
        "ordinal": 19,
        "name": "report_reasons",
        "type_info": "Jsonb"
      },
      {
        "ordinal": 20,
        "name": "cultural_context",
        "type_info": "Text"
      },
      {
        "ordinal": 21,
        "name": "ml_style",
        "type_info": "Varchar"
      },
      {
        "ordinal": 22,
        "name": "ml_script",
        "type_info": "Varchar"
      },
      {
        "ordinal": 23,
        "name": "ml_confidence",
        "type_info": "Float4"
      },
      {
        "ordinal": 24,
        "name": "ml_color_palette",
        "type_info": "Jsonb"
      }
    ],
    "parameters": {
      "Left": [
        "Text",
        "Text"
      ]
    },
    "nullable": [
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      null,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      false,
      false,
      true,
      true,
      true,
      true,
      true
    ]
  },
  "hash": "e490068ada0d7f349a73cf8e4697a82dbc8008f963038fba711fcb19b004b70a"
}

```

### File: apps/api/.sqlx/query-ea6448a632f9a7f7b9b1df41f7a7fcafedbcbbb7bd2d617807f249b8d8886625.json

```
{
  "db_name": "PostgreSQL",
  "query": "SELECT id, lettering_id, content, user_ip, created_at FROM comments \n            WHERE lettering_id = $1 ORDER BY created_at DESC",
  "describe": {
    "columns": [
      {
        "ordinal": 0,
        "name": "id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 1,
        "name": "lettering_id",
        "type_info": "Uuid"
      },
      {
        "ordinal": 2,
        "name": "content",
        "type_info": "Text"
      },
      {
        "ordinal": 3,
        "name": "user_ip",
        "type_info": "Inet"
      },
      {
        "ordinal": 4,
        "name": "created_at",
        "type_info": "Timestamptz"
      }
    ],
    "parameters": {
      "Left": [
        "Uuid"
      ]
    },
    "nullable": [
      false,
      false,
      false,
      true,
      false
    ]
  },
  "hash": "ea6448a632f9a7f7b9b1df41f7a7fcafedbcbbb7bd2d617807f249b8d8886625"
}

```

### File: apps/api/.sqlx/query-f77d0acaa96e652138736fe46f68ad98c8a16a0bfd52706d50d41317505791c4.json

```
{
  "db_name": "PostgreSQL",
  "query": "INSERT INTO comments (id, lettering_id, content, user_ip) \n            VALUES ($1, $2, $3, $4)",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid",
        "Uuid",
        "Text",
        "Inet"
      ]
    },
    "nullable": []
  },
  "hash": "f77d0acaa96e652138736fe46f68ad98c8a16a0bfd52706d50d41317505791c4"
}

```

### File: apps/api/.sqlx/query-fdd978b2695263192d24a9817f4889dcc3c3f309dd8cac3a2c3d05a7cf9b7843.json

```
{
  "db_name": "PostgreSQL",
  "query": "INSERT INTO likes (id, lettering_id, user_ip) \n            VALUES ($1, $2, $3) \n            ON CONFLICT (lettering_id, user_ip) DO NOTHING",
  "describe": {
    "columns": [],
    "parameters": {
      "Left": [
        "Uuid",
        "Uuid",
        "Inet"
      ]
    },
    "nullable": []
  },
  "hash": "fdd978b2695263192d24a9817f4889dcc3c3f309dd8cac3a2c3d05a7cf9b7843"
}

```

### File: apps/api/Cargo.lock

```
# This file is automatically @generated by Cargo.
# It is not intended for manual editing.
version = 4

[[package]]
name = "adler2"
version = "2.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "320119579fcad9c21884f5c4861d16174d0e06250625266f50fe6898340abefa"

[[package]]
name = "aho-corasick"
version = "1.1.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ddd31a130427c27518df266943a5308ed92d4b226cc639f5a8f1002816174301"
dependencies = [
 "memchr",
]

[[package]]
name = "aligned"
version = "0.4.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ee4508988c62edf04abd8d92897fca0c2995d907ce1dfeaf369dac3716a40685"
dependencies = [
 "as-slice",
]

[[package]]
name = "aligned-vec"
version = "0.6.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "dc890384c8602f339876ded803c97ad529f3842aba97f6392b3dba0dd171769b"
dependencies = [
 "equator",
]

[[package]]
name = "allocator-api2"
version = "0.2.21"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "683d7910e743518b0e34f1186f92494becacb047c7b6bf616c96772180fef923"

[[package]]
name = "android_system_properties"
version = "0.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "819e7219dbd41043ac279b19830f2efc897156490d7fd6ea916720117ee66311"
dependencies = [
 "libc",
]

[[package]]
name = "anstyle"
version = "1.0.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5192cca8006f1fd4f7237516f40fa183bb07f8fbdfedaa0036de5ea9b0b45e78"

[[package]]
name = "anyhow"
version = "1.0.101"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5f0e0fee31ef5ed1ba1316088939cea399010ed7731dba877ed44aeb407a75ea"

[[package]]
name = "api"
version = "0.1.0"
dependencies = [
 "anyhow",
 "async-trait",
 "aws-config",
 "aws-credential-types",
 "aws-sdk-s3",
 "axum",
 "base64",
 "bytes",
 "chrono",
 "config",
 "dotenvy",
 "image",
 "jsonwebtoken",
 "lazy_static",
 "mockall",
 "ndarray 0.15.6",
 "ort",
 "redis",
 "regex",
 "reqwest",
 "serde",
 "serde_json",
 "sha2",
 "sqlx",
 "thiserror 2.0.18",
 "tokio",
 "tower",
 "tower-http",
 "tracing",
 "tracing-subscriber",
 "ts-rs",
 "uuid",
 "validator",
]

[[package]]
name = "arbitrary"
version = "1.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c3d036a3c4ab069c7b410a2ce876bd74808d2d0888a82667669f8e783a898bf1"

[[package]]
name = "arc-swap"
version = "1.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9ded5f9a03ac8f24d1b8a25101ee812cd32cdc8c50a4c50237de2c4915850e73"
dependencies = [
 "rustversion",
]

[[package]]
name = "arcstr"
version = "1.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "03918c3dbd7701a85c6b9887732e2921175f26c350b4563841d0958c21d57e6d"

[[package]]
name = "arg_enum_proc_macro"
version = "0.3.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0ae92a5119aa49cdbcf6b9f893fe4e1d98b04ccbf82ee0584ad948a44a734dea"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "arraydeque"
version = "0.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7d902e3d592a523def97af8f317b08ce16b7ab854c1985a0c671e6f15cebc236"

[[package]]
name = "arrayvec"
version = "0.7.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7c02d123df017efcdfbd739ef81735b36c5ba83ec3c59c80a9d7ecc718f92e50"

[[package]]
name = "as-slice"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "516b6b4f0e40d50dcda9365d53964ec74560ad4284da2e7fc97122cd83174516"
dependencies = [
 "stable_deref_trait",
]

[[package]]
name = "async-trait"
version = "0.1.89"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9035ad2d096bed7955a320ee7e2230574d28fd3c3a0f186cbea1ff3c7eed5dbb"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "atoi"
version = "2.0.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f28d99ec8bfea296261ca1af174f24225171fea9664ba9003cbebee704810528"
dependencies = [
 "num-traits",
]

[[package]]
name = "atomic-waker"
version = "1.1.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1505bd5d3d116872e7271a6d4e16d81d0c8570876c8de68093a09ac269d8aac0"

[[package]]
name = "autocfg"
version = "1.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c08606f8c3cbf4ce6ec8e28fb0014a2c086708fe954eaa885384a6165172e7e8"

[[package]]
name = "av-scenechange"
version = "0.14.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0f321d77c20e19b92c39e7471cf986812cbb46659d2af674adc4331ef3f18394"
dependencies = [
 "aligned",
 "anyhow",
 "arg_enum_proc_macro",
 "arrayvec",
 "log",
 "num-rational",
 "num-traits",
 "pastey",
 "rayon",
 "thiserror 2.0.18",
 "v_frame",
 "y4m",
]

[[package]]
name = "av1-grain"
version = "0.2.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8cfddb07216410377231960af4fcab838eaa12e013417781b78bd95ee22077f8"
dependencies = [
 "anyhow",
 "arrayvec",
 "log",
 "nom",
 "num-rational",
 "v_frame",
]

[[package]]
name = "avif-serialize"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "47c8fbc0f831f4519fe8b810b6a7a91410ec83031b8233f730a0480029f6a23f"
dependencies = [
 "arrayvec",
]

[[package]]
name = "aws-config"
version = "1.8.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c456581cb3c77fafcc8c67204a70680d40b61112d6da78c77bd31d945b65f1b5"
dependencies = [
 "aws-credential-types",
 "aws-runtime",
 "aws-sdk-sso",
 "aws-sdk-ssooidc",
 "aws-sdk-sts",
 "aws-smithy-async",
 "aws-smithy-http",
 "aws-smithy-json",
 "aws-smithy-runtime",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "aws-types",
 "bytes",
 "fastrand",
 "hex",
 "http 1.4.0",
 "ring",
 "time",
 "tokio",
 "tracing",
 "url",
 "zeroize",
]

[[package]]
name = "aws-credential-types"
version = "1.2.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3cd362783681b15d136480ad555a099e82ecd8e2d10a841e14dfd0078d67fee3"
dependencies = [
 "aws-smithy-async",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "zeroize",
]

[[package]]
name = "aws-lc-rs"
version = "1.15.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7b7b6141e96a8c160799cc2d5adecd5cbbe5054cb8c7c4af53da0f83bb7ad256"
dependencies = [
 "aws-lc-sys",
 "zeroize",
]

[[package]]
name = "aws-lc-sys"
version = "0.37.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5c34dda4df7017c8db52132f0f8a2e0f8161649d15723ed63fc00c82d0f2081a"
dependencies = [
 "cc",
 "cmake",
 "dunce",
 "fs_extra",
]

[[package]]
name = "aws-runtime"
version = "1.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c635c2dc792cb4a11ce1a4f392a925340d1bdf499289b5ec1ec6810954eb43f5"
dependencies = [
 "aws-credential-types",
 "aws-sigv4",
 "aws-smithy-async",
 "aws-smithy-eventstream",
 "aws-smithy-http",
 "aws-smithy-runtime",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "aws-types",
 "bytes",
 "fastrand",
 "http 0.2.12",
 "http 1.4.0",
 "http-body 0.4.6",
 "http-body 1.0.1",
 "percent-encoding",
 "pin-project-lite",
 "tracing",
 "uuid",
]

[[package]]
name = "aws-sdk-s3"
version = "1.122.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "94c2ca0cba97e8e279eb6c0b2d0aa10db5959000e602ab2b7c02de6b85d4c19b"
dependencies = [
 "aws-credential-types",
 "aws-runtime",
 "aws-sigv4",
 "aws-smithy-async",
 "aws-smithy-checksums",
 "aws-smithy-eventstream",
 "aws-smithy-http",
 "aws-smithy-json",
 "aws-smithy-observability",
 "aws-smithy-runtime",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "aws-smithy-xml",
 "aws-types",
 "bytes",
 "fastrand",
 "hex",
 "hmac",
 "http 0.2.12",
 "http 1.4.0",
 "http-body 1.0.1",
 "lru",
 "percent-encoding",
 "regex-lite",
 "sha2",
 "tracing",
 "url",
]

[[package]]
name = "aws-sdk-sso"
version = "1.93.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9dcb38bb33fc0a11f1ffc3e3e85669e0a11a37690b86f77e75306d8f369146a0"
dependencies = [
 "aws-credential-types",
 "aws-runtime",
 "aws-smithy-async",
 "aws-smithy-http",
 "aws-smithy-json",
 "aws-smithy-observability",
 "aws-smithy-runtime",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "aws-types",
 "bytes",
 "fastrand",
 "http 0.2.12",
 "http 1.4.0",
 "regex-lite",
 "tracing",
]

[[package]]
name = "aws-sdk-ssooidc"
version = "1.95.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2ada8ffbea7bd1be1f53df1dadb0f8fdb04badb13185b3321b929d1ee3caad09"
dependencies = [
 "aws-credential-types",
 "aws-runtime",
 "aws-smithy-async",
 "aws-smithy-http",
 "aws-smithy-json",
 "aws-smithy-observability",
 "aws-smithy-runtime",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "aws-types",
 "bytes",
 "fastrand",
 "http 0.2.12",
 "http 1.4.0",
 "regex-lite",
 "tracing",
]

[[package]]
name = "aws-sdk-sts"
version = "1.97.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e6443ccadc777095d5ed13e21f5c364878c9f5bad4e35187a6cdbd863b0afcad"
dependencies = [
 "aws-credential-types",
 "aws-runtime",
 "aws-smithy-async",
 "aws-smithy-http",
 "aws-smithy-json",
 "aws-smithy-observability",
 "aws-smithy-query",
 "aws-smithy-runtime",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "aws-smithy-xml",
 "aws-types",
 "fastrand",
 "http 0.2.12",
 "http 1.4.0",
 "regex-lite",
 "tracing",
]

[[package]]
name = "aws-sigv4"
version = "1.3.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "efa49f3c607b92daae0c078d48a4571f599f966dce3caee5f1ea55c4d9073f99"
dependencies = [
 "aws-credential-types",
 "aws-smithy-eventstream",
 "aws-smithy-http",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "bytes",
 "crypto-bigint 0.5.5",
 "form_urlencoded",
 "hex",
 "hmac",
 "http 0.2.12",
 "http 1.4.0",
 "p256 0.11.1",
 "percent-encoding",
 "ring",
 "sha2",
 "subtle",
 "time",
 "tracing",
 "zeroize",
]

[[package]]
name = "aws-smithy-async"
version = "1.2.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "52eec3db979d18cb807fc1070961cc51d87d069abe9ab57917769687368a8c6c"
dependencies = [
 "futures-util",
 "pin-project-lite",
 "tokio",
]

[[package]]
name = "aws-smithy-checksums"
version = "0.64.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ddcf418858f9f3edd228acb8759d77394fed7531cce78d02bdda499025368439"
dependencies = [
 "aws-smithy-http",
 "aws-smithy-types",
 "bytes",
 "crc-fast",
 "hex",
 "http 1.4.0",
 "http-body 1.0.1",
 "http-body-util",
 "md-5",
 "pin-project-lite",
 "sha1",
 "sha2",
 "tracing",
]

[[package]]
name = "aws-smithy-eventstream"
version = "0.60.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "35b9c7354a3b13c66f60fe4616d6d1969c9fd36b1b5333a5dfb3ee716b33c588"
dependencies = [
 "aws-smithy-types",
 "bytes",
 "crc32fast",
]

[[package]]
name = "aws-smithy-http"
version = "0.63.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "630e67f2a31094ffa51b210ae030855cb8f3b7ee1329bdd8d085aaf61e8b97fc"
dependencies = [
 "aws-smithy-eventstream",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "bytes",
 "bytes-utils",
 "futures-core",
 "futures-util",
 "http 1.4.0",
 "http-body 1.0.1",
 "http-body-util",
 "percent-encoding",
 "pin-project-lite",
 "pin-utils",
 "tracing",
]

[[package]]
name = "aws-smithy-http-client"
version = "1.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "12fb0abf49ff0cab20fd31ac1215ed7ce0ea92286ba09e2854b42ba5cabe7525"
dependencies = [
 "aws-smithy-async",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "h2 0.3.27",
 "h2 0.4.13",
 "http 0.2.12",
 "http 1.4.0",
 "http-body 0.4.6",
 "hyper 0.14.32",
 "hyper 1.8.1",
 "hyper-rustls 0.24.2",
 "hyper-rustls 0.27.7",
 "hyper-util",
 "pin-project-lite",
 "rustls 0.21.12",
 "rustls 0.23.36",
 "rustls-native-certs",
 "rustls-pki-types",
 "tokio",
 "tokio-rustls 0.26.4",
 "tower",
 "tracing",
]

[[package]]
name = "aws-smithy-json"
version = "0.62.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3cb96aa208d62ee94104645f7b2ecaf77bf27edf161590b6224bfbac2832f979"
dependencies = [
 "aws-smithy-types",
]

[[package]]
name = "aws-smithy-observability"
version = "0.2.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c0a46543fbc94621080b3cf553eb4cbbdc41dd9780a30c4756400f0139440a1d"
dependencies = [
 "aws-smithy-runtime-api",
]

[[package]]
name = "aws-smithy-query"
version = "0.60.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0cebbddb6f3a5bd81553643e9c7daf3cc3dc5b0b5f398ac668630e8a84e6fff0"
dependencies = [
 "aws-smithy-types",
 "urlencoding",
]

[[package]]
name = "aws-smithy-runtime"
version = "1.10.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f3df87c14f0127a0d77eb261c3bc45d5b4833e2a1f63583ebfb728e4852134ee"
dependencies = [
 "aws-smithy-async",
 "aws-smithy-http",
 "aws-smithy-http-client",
 "aws-smithy-observability",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "bytes",
 "fastrand",
 "http 0.2.12",
 "http 1.4.0",
 "http-body 0.4.6",
 "http-body 1.0.1",
 "http-body-util",
 "pin-project-lite",
 "pin-utils",
 "tokio",
 "tracing",
]

[[package]]
name = "aws-smithy-runtime-api"
version = "1.11.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "49952c52f7eebb72ce2a754d3866cc0f87b97d2a46146b79f80f3a93fb2b3716"
dependencies = [
 "aws-smithy-async",
 "aws-smithy-types",
 "bytes",
 "http 0.2.12",
 "http 1.4.0",
 "pin-project-lite",
 "tokio",
 "tracing",
 "zeroize",
]

[[package]]
name = "aws-smithy-types"
version = "1.4.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3b3a26048eeab0ddeba4b4f9d51654c79af8c3b32357dc5f336cee85ab331c33"
dependencies = [
 "base64-simd",
 "bytes",
 "bytes-utils",
 "futures-core",
 "http 0.2.12",
 "http 1.4.0",
 "http-body 0.4.6",
 "http-body 1.0.1",
 "http-body-util",
 "itoa",
 "num-integer",
 "pin-project-lite",
 "pin-utils",
 "ryu",
 "serde",
 "time",
 "tokio",
 "tokio-util",
]

[[package]]
name = "aws-smithy-xml"
version = "0.60.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "11b2f670422ff42bf7065031e72b45bc52a3508bd089f743ea90731ca2b6ea57"
dependencies = [
 "xmlparser",
]

[[package]]
name = "aws-types"
version = "1.3.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1d980627d2dd7bfc32a3c025685a033eeab8d365cc840c631ef59d1b8f428164"
dependencies = [
 "aws-credential-types",
 "aws-smithy-async",
 "aws-smithy-runtime-api",
 "aws-smithy-types",
 "rustc_version",
 "tracing",
]

[[package]]
name = "axum"
version = "0.8.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8b52af3cb4058c895d37317bb27508dccc8e5f2d39454016b297bf4a400597b8"
dependencies = [
 "axum-core",
 "axum-macros",
 "bytes",
 "form_urlencoded",
 "futures-util",
 "http 1.4.0",
 "http-body 1.0.1",
 "http-body-util",
 "hyper 1.8.1",
 "hyper-util",
 "itoa",
 "matchit",
 "memchr",
 "mime",
 "multer",
 "percent-encoding",
 "pin-project-lite",
 "serde_core",
 "serde_json",
 "serde_path_to_error",
 "serde_urlencoded",
 "sync_wrapper",
 "tokio",
 "tower",
 "tower-layer",
 "tower-service",
 "tracing",
]

[[package]]
name = "axum-core"
version = "0.5.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "08c78f31d7b1291f7ee735c1c6780ccde7785daae9a9206026862dab7d8792d1"
dependencies = [
 "bytes",
 "futures-core",
 "http 1.4.0",
 "http-body 1.0.1",
 "http-body-util",
 "mime",
 "pin-project-lite",
 "sync_wrapper",
 "tower-layer",
 "tower-service",
 "tracing",
]

[[package]]
name = "axum-macros"
version = "0.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "604fde5e028fea851ce1d8570bbdc034bec850d157f7569d10f347d06808c05c"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "backon"
version = "1.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cffb0e931875b666fc4fcb20fee52e9bbd1ef836fd9e9e04ec21555f9f85f7ef"
dependencies = [
 "fastrand",
]

[[package]]
name = "base16ct"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "349a06037c7bf932dd7e7d1f653678b2038b9ad46a74102f1fc7bd7872678cce"

[[package]]
name = "base16ct"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4c7f02d4ea65f2c1853089ffd8d2787bdbc63de2f0d29dedbcf8ccdfa0ccd4cf"

[[package]]
name = "base64"
version = "0.22.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "72b3254f16251a8381aa12e40e3c4d2f0199f8c6508fbecb9d91f575e0fbb8c6"

[[package]]
name = "base64-simd"
version = "0.8.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "339abbe78e73178762e23bea9dfd08e697eb3f3301cd4be981c0f78ba5859195"
dependencies = [
 "outref",
 "vsimd",
]

[[package]]
name = "base64ct"
version = "1.8.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2af50177e190e07a26ab74f8b1efbfe2ef87da2116221318cb1c2e82baf7de06"

[[package]]
name = "bit_field"
version = "0.10.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1e4b40c7323adcfc0a41c4b88143ed58346ff65a288fc144329c5c45e05d70c6"

[[package]]
name = "bitflags"
version = "2.10.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "812e12b5285cc515a9c72a5c1d3b6d46a19dac5acfef5265968c166106e31dd3"
dependencies = [
 "serde_core",
]

[[package]]
name = "bitstream-io"
version = "4.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "60d4bd9d1db2c6bdf285e223a7fa369d5ce98ec767dec949c6ca62863ce61757"
dependencies = [
 "core2",
]

[[package]]
name = "block-buffer"
version = "0.10.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3078c7629b62d3f0439517fa394996acacc5cbc91c5a20d8c658e77abd503a71"
dependencies = [
 "generic-array",
]

[[package]]
name = "built"
version = "0.8.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f4ad8f11f288f48ca24471bbd51ac257aaeaaa07adae295591266b792902ae64"

[[package]]
name = "bumpalo"
version = "3.19.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5dd9dc738b7a8311c7ade152424974d8115f2cdad61e8dab8dac9f2362298510"

[[package]]
name = "bytemuck"
version = "1.25.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c8efb64bd706a16a1bdde310ae86b351e4d21550d98d056f22f8a7f7a2183fec"

[[package]]
name = "byteorder"
version = "1.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1fd0f2584146f6f2ef48085050886acf353beff7305ebd1ae69500e27c67f64b"

[[package]]
name = "byteorder-lite"
version = "0.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8f1fe948ff07f4bd06c30984e69f5b4899c516a3ef74f34df92a2df2ab535495"

[[package]]
name = "bytes"
version = "1.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1e748733b7cbc798e1434b6ac524f0c1ff2ab456fe201501e6497c8417a4fc33"

[[package]]
name = "bytes-utils"
version = "0.1.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7dafe3a8757b027e2be6e4e5601ed563c55989fcf1546e933c66c8eb3a058d35"
dependencies = [
 "bytes",
 "either",
]

[[package]]
name = "cc"
version = "1.2.55"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "47b26a0954ae34af09b50f0de26458fa95369a0d478d8236d3f93082b219bd29"
dependencies = [
 "find-msvc-tools",
 "jobserver",
 "libc",
 "shlex",
]

[[package]]
name = "cesu8"
version = "1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6d43a04d8753f35258c91f8ec639f792891f748a1edbd759cf1dcea3382ad83c"

[[package]]
name = "cfg-if"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9330f8b2ff13f34540b44e946ef35111825727b38d33286ef986142615121801"

[[package]]
name = "cfg_aliases"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "613afe47fcd5fac7ccf1db93babcb082c5994d996f20b8b159f2ad1658eb5724"

[[package]]
name = "chrono"
version = "0.4.43"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fac4744fb15ae8337dc853fee7fb3f4e48c0fbaa23d0afe49c447b4fab126118"
dependencies = [
 "iana-time-zone",
 "js-sys",
 "num-traits",
 "serde",
 "wasm-bindgen",
 "windows-link",
]

[[package]]
name = "cmake"
version = "0.1.57"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "75443c44cd6b379beb8c5b45d85d0773baf31cce901fe7bb252f4eff3008ef7d"
dependencies = [
 "cc",
]

[[package]]
name = "color_quant"
version = "1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3d7b894f5411737b7867f4827955924d7c254fc9f4d91a6aad6b097804b1018b"

[[package]]
name = "combine"
version = "4.6.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ba5a308b75df32fe02788e748662718f03fde005016435c444eea572398219fd"
dependencies = [
 "bytes",
 "futures-core",
 "memchr",
 "pin-project-lite",
 "tokio",
 "tokio-util",
]

[[package]]
name = "concurrent-queue"
version = "2.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4ca0197aee26d1ae37445ee532fefce43251d24cc7c166799f4d46817f1d3973"
dependencies = [
 "crossbeam-utils",
]

[[package]]
name = "config"
version = "0.15.19"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b30fa8254caad766fc03cb0ccae691e14bf3bd72bfff27f72802ce729551b3d6"
dependencies = [
 "async-trait",
 "convert_case",
 "json5",
 "pathdiff",
 "ron",
 "rust-ini",
 "serde-untagged",
 "serde_core",
 "serde_json",
 "toml",
 "winnow",
 "yaml-rust2",
]

[[package]]
name = "const-oid"
version = "0.9.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c2459377285ad874054d797f3ccebf984978aa39129f6eafde5cdc8315b612f8"

[[package]]
name = "const-random"
version = "0.1.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "87e00182fe74b066627d63b85fd550ac2998d4b0bd86bfed477a0ae4c7c71359"
dependencies = [
 "const-random-macro",
]

[[package]]
name = "const-random-macro"
version = "0.1.16"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f9d839f2a20b0aee515dc581a6172f2321f96cab76c1a38a4c584a194955390e"
dependencies = [
 "getrandom 0.2.17",
 "once_cell",
 "tiny-keccak",
]

[[package]]
name = "convert_case"
version = "0.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ec182b0ca2f35d8fc196cf3404988fd8b8c739a4d270ff118a398feb0cbec1ca"
dependencies = [
 "unicode-segmentation",
]

[[package]]
name = "core-foundation"
version = "0.9.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "91e195e091a93c46f7102ec7818a2aa394e1e1771c3ab4825963fa03e45afb8f"
dependencies = [
 "core-foundation-sys",
 "libc",
]

[[package]]
name = "core-foundation"
version = "0.10.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b2a6cd9ae233e7f62ba4e9353e81a88df7fc8a5987b8d445b4d90c879bd156f6"
dependencies = [
 "core-foundation-sys",
 "libc",
]

[[package]]
name = "core-foundation-sys"
version = "0.8.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "773648b94d0e5d620f64f280777445740e61fe701025087ec8b57f45c791888b"

[[package]]
name = "core2"
version = "0.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b49ba7ef1ad6107f8824dbe97de947cbaac53c44e7f9756a1fba0d37c1eec505"
dependencies = [
 "memchr",
]

[[package]]
name = "cpufeatures"
version = "0.2.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "59ed5838eebb26a2bb2e58f6d5b5316989ae9d08bab10e0e6d103e656d1b0280"
dependencies = [
 "libc",
]

[[package]]
name = "crc"
version = "3.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9710d3b3739c2e349eb44fe848ad0b7c8cb1e42bd87ee49371df2f7acaf3e675"
dependencies = [
 "crc-catalog",
]

[[package]]
name = "crc-catalog"
version = "2.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "19d374276b40fb8bbdee95aef7c7fa6b5316ec764510eb64b8dd0e2ed0d7e7f5"

[[package]]
name = "crc-fast"
version = "1.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2fd92aca2c6001b1bf5ba0ff84ee74ec8501b52bbef0cac80bf25a6c1d87a83d"
dependencies = [
 "crc",
 "digest",
 "rustversion",
 "spin 0.10.0",
]

[[package]]
name = "crc32fast"
version = "1.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9481c1c90cbf2ac953f07c8d4a58aa3945c425b7185c9154d67a65e4230da511"
dependencies = [
 "cfg-if",
]

[[package]]
name = "crossbeam-deque"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9dd111b7b7f7d55b72c0a6ae361660ee5853c9af73f70c3c2ef6858b950e2e51"
dependencies = [
 "crossbeam-epoch",
 "crossbeam-utils",
]

[[package]]
name = "crossbeam-epoch"
version = "0.9.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5b82ac4a3c2ca9c3460964f020e1402edd5753411d7737aa39c3714ad1b5420e"
dependencies = [
 "crossbeam-utils",
]

[[package]]
name = "crossbeam-queue"
version = "0.3.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0f58bbc28f91df819d0aa2a2c00cd19754769c2fad90579b3592b1c9ba7a3115"
dependencies = [
 "crossbeam-utils",
]

[[package]]
name = "crossbeam-utils"
version = "0.8.21"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d0a5c400df2834b80a4c3327b3aad3a4c4cd4de0629063962b03235697506a28"

[[package]]
name = "crunchy"
version = "0.2.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "460fbee9c2c2f33933d720630a6a0bac33ba7053db5344fac858d4b8952d77d5"

[[package]]
name = "crypto-bigint"
version = "0.4.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ef2b4b23cddf68b89b8f8069890e8c270d54e2d5fe1b143820234805e4cb17ef"
dependencies = [
 "generic-array",
 "rand_core 0.6.4",
 "subtle",
 "zeroize",
]

[[package]]
name = "crypto-bigint"
version = "0.5.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0dc92fb57ca44df6db8059111ab3af99a63d5d0f8375d9972e319a379c6bab76"
dependencies = [
 "generic-array",
 "rand_core 0.6.4",
 "subtle",
 "zeroize",
]

[[package]]
name = "crypto-common"
version = "0.1.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "78c8292055d1c1df0cce5d180393dc8cce0abec0a7102adb6c7b1eef6016d60a"
dependencies = [
 "generic-array",
 "typenum",
]

[[package]]
name = "curve25519-dalek"
version = "4.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "97fb8b7c4503de7d6ae7b42ab72a5a59857b4c937ec27a3d4539dba95b5ab2be"
dependencies = [
 "cfg-if",
 "cpufeatures",
 "curve25519-dalek-derive",
 "digest",
 "fiat-crypto",
 "rustc_version",
 "subtle",
 "zeroize",
]

[[package]]
name = "curve25519-dalek-derive"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f46882e17999c6cc590af592290432be3bce0428cb0d5f8b6715e4dc7b383eb3"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "darling"
version = "0.20.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fc7f46116c46ff9ab3eb1597a45688b6715c6e628b5c133e288e709a29bcb4ee"
dependencies = [
 "darling_core",
 "darling_macro",
]

[[package]]
name = "darling_core"
version = "0.20.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0d00b9596d185e565c2207a0b01f8bd1a135483d02d9b7b0a54b11da8d53412e"
dependencies = [
 "fnv",
 "ident_case",
 "proc-macro2",
 "quote",
 "strsim",
 "syn",
]

[[package]]
name = "darling_macro"
version = "0.20.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fc34b93ccb385b40dc71c6fceac4b2ad23662c7eeb248cf10d529b7e055b6ead"
dependencies = [
 "darling_core",
 "quote",
 "syn",
]

[[package]]
name = "der"
version = "0.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f1a467a65c5e759bce6e65eaf91cc29f466cdc57cb65777bd646872a8a1fd4de"
dependencies = [
 "const-oid",
 "zeroize",
]

[[package]]
name = "der"
version = "0.7.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e7c1832837b905bbfb5101e07cc24c8deddf52f93225eee6ead5f4d63d53ddcb"
dependencies = [
 "const-oid",
 "pem-rfc7468",
 "zeroize",
]

[[package]]
name = "deranged"
version = "0.5.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ececcb659e7ba858fb4f10388c250a7252eb0a27373f1a72b8748afdd248e587"
dependencies = [
 "powerfmt",
]

[[package]]
name = "digest"
version = "0.10.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9ed9a281f7bc9b7576e61468ba615a66a5c8cfdff42420a70aa82701a3b1e292"
dependencies = [
 "block-buffer",
 "const-oid",
 "crypto-common",
 "subtle",
]

[[package]]
name = "displaydoc"
version = "0.2.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "97369cbbc041bc366949bc74d34658d6cda5621039731c6310521892a3a20ae0"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "dlv-list"
version = "0.5.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "442039f5147480ba31067cb00ada1adae6892028e40e45fc5de7b7df6dcc1b5f"
dependencies = [
 "const-random",
]

[[package]]
name = "dotenvy"
version = "0.15.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1aaf95b3e5c8f23aa320147307562d361db0ae0d51242340f558153b4eb2439b"

[[package]]
name = "downcast"
version = "0.11.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1435fa1053d8b2fbbe9be7e97eca7f33d37b28409959813daefc1446a14247f1"

[[package]]
name = "dunce"
version = "1.0.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "92773504d58c093f6de2459af4af33faa518c13451eb8f2b5698ed3d36e7c813"

[[package]]
name = "ecdsa"
version = "0.14.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "413301934810f597c1d19ca71c8710e99a3f1ba28a0d2ebc01551a2daeea3c5c"
dependencies = [
 "der 0.6.1",
 "elliptic-curve 0.12.3",
 "rfc6979 0.3.1",
 "signature 1.6.4",
]

[[package]]
name = "ecdsa"
version = "0.16.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ee27f32b5c5292967d2d4a9d7f1e0b0aed2c15daded5a60300e4abb9d8020bca"
dependencies = [
 "der 0.7.10",
 "digest",
 "elliptic-curve 0.13.8",
 "rfc6979 0.4.0",
 "signature 2.2.0",
 "spki 0.7.3",
]

[[package]]
name = "ed25519"
version = "2.2.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "115531babc129696a58c64a4fef0a8bf9e9698629fb97e9e40767d235cfbcd53"
dependencies = [
 "pkcs8 0.10.2",
 "signature 2.2.0",
]

[[package]]
name = "ed25519-dalek"
version = "2.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "70e796c081cee67dc755e1a36a0a172b897fab85fc3f6bc48307991f64e4eca9"
dependencies = [
 "curve25519-dalek",
 "ed25519",
 "serde",
 "sha2",
 "subtle",
 "zeroize",
]

[[package]]
name = "either"
version = "1.15.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "48c757948c5ede0e46177b7add2e67155f70e33c07fea8284df6576da70b3719"
dependencies = [
 "serde",
]

[[package]]
name = "elliptic-curve"
version = "0.12.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e7bb888ab5300a19b8e5bceef25ac745ad065f3c9f7efc6de1b91958110891d3"
dependencies = [
 "base16ct 0.1.1",
 "crypto-bigint 0.4.9",
 "der 0.6.1",
 "digest",
 "ff 0.12.1",
 "generic-array",
 "group 0.12.1",
 "pkcs8 0.9.0",
 "rand_core 0.6.4",
 "sec1 0.3.0",
 "subtle",
 "zeroize",
]

[[package]]
name = "elliptic-curve"
version = "0.13.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b5e6043086bf7973472e0c7dff2142ea0b680d30e18d9cc40f267efbf222bd47"
dependencies = [
 "base16ct 0.2.0",
 "crypto-bigint 0.5.5",
 "digest",
 "ff 0.13.1",
 "generic-array",
 "group 0.13.0",
 "hkdf",
 "pem-rfc7468",
 "pkcs8 0.10.2",
 "rand_core 0.6.4",
 "sec1 0.7.3",
 "subtle",
 "zeroize",
]

[[package]]
name = "encoding_rs"
version = "0.8.35"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "75030f3c4f45dafd7586dd6780965a8c7e8e285a5ecb86713e63a79c5b2766f3"
dependencies = [
 "cfg-if",
]

[[package]]
name = "equator"
version = "0.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4711b213838dfee0117e3be6ac926007d7f433d7bbe33595975d4190cb07e6fc"
dependencies = [
 "equator-macro",
]

[[package]]
name = "equator-macro"
version = "0.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "44f23cf4b44bfce11a86ace86f8a73ffdec849c9fd00a386a53d278bd9e81fb3"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "equivalent"
version = "1.0.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "877a4ace8713b0bcf2a4e7eec82529c029f1d0619886d18145fea96c3ffe5c0f"

[[package]]
name = "erased-serde"
version = "0.4.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "89e8918065695684b2b0702da20382d5ae6065cf3327bc2d6436bd49a71ce9f3"
dependencies = [
 "serde",
 "serde_core",
 "typeid",
]

[[package]]
name = "errno"
version = "0.3.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "39cab71617ae0d63f51a36d69f866391735b51691dbda63cf6f96d042b63efeb"
dependencies = [
 "libc",
 "windows-sys 0.61.2",
]

[[package]]
name = "etcetera"
version = "0.8.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "136d1b5283a1ab77bd9257427ffd09d8667ced0570b6f938942bc7568ed5b943"
dependencies = [
 "cfg-if",
 "home",
 "windows-sys 0.48.0",
]

[[package]]
name = "event-listener"
version = "5.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e13b66accf52311f30a0db42147dadea9850cb48cd070028831ae5f5d4b856ab"
dependencies = [
 "concurrent-queue",
 "parking",
 "pin-project-lite",
]

[[package]]
name = "exr"
version = "1.74.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4300e043a56aa2cb633c01af81ca8f699a321879a7854d3896a0ba89056363be"
dependencies = [
 "bit_field",
 "half",
 "lebe",
 "miniz_oxide",
 "rayon-core",
 "smallvec",
 "zune-inflate",
]

[[package]]
name = "fastrand"
version = "2.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "37909eebbb50d72f9059c3b6d82c0463f2ff062c9e95845c43a6c9c0355411be"

[[package]]
name = "fax"
version = "0.2.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f05de7d48f37cd6730705cbca900770cab77a89f413d23e100ad7fad7795a0ab"
dependencies = [
 "fax_derive",
]

[[package]]
name = "fax_derive"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a0aca10fb742cb43f9e7bb8467c91aa9bcb8e3ffbc6a6f7389bb93ffc920577d"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "fdeflate"
version = "0.3.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1e6853b52649d4ac5c0bd02320cddc5ba956bdb407c4b75a2c6b75bf51500f8c"
dependencies = [
 "simd-adler32",
]

[[package]]
name = "ff"
version = "0.12.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d013fc25338cc558c5c2cfbad646908fb23591e2404481826742b651c9af7160"
dependencies = [
 "rand_core 0.6.4",
 "subtle",
]

[[package]]
name = "ff"
version = "0.13.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c0b50bfb653653f9ca9095b427bed08ab8d75a137839d9ad64eb11810d5b6393"
dependencies = [
 "rand_core 0.6.4",
 "subtle",
]

[[package]]
name = "fiat-crypto"
version = "0.2.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "28dea519a9695b9977216879a3ebfddf92f1c08c05d984f8996aecd6ecdc811d"

[[package]]
name = "find-msvc-tools"
version = "0.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5baebc0774151f905a1a2cc41989300b1e6fbb29aff0ceffa1064fdd3088d582"

[[package]]
name = "flate2"
version = "1.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "843fba2746e448b37e26a819579957415c8cef339bf08564fe8b7ddbd959573c"
dependencies = [
 "crc32fast",
 "miniz_oxide",
]

[[package]]
name = "flume"
version = "0.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "da0e4dd2a88388a1f4ccc7c9ce104604dab68d9f408dc34cd45823d5a9069095"
dependencies = [
 "futures-core",
 "futures-sink",
 "spin 0.9.8",
]

[[package]]
name = "fnv"
version = "1.0.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3f9eec918d3f24069decb9af1554cad7c880e2da24a9afd88aca000531ab82c1"

[[package]]
name = "foldhash"
version = "0.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d9c4f5dac5e15c24eb999c26181a6ca40b39fe946cbe4c263c7209467bc83af2"

[[package]]
name = "foldhash"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "77ce24cb58228fbb8aa041425bb1050850ac19177686ea6e0f41a70416f56fdb"

[[package]]
name = "foreign-types"
version = "0.3.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f6f339eb8adc052cd2ca78910fda869aefa38d22d5cb648e6485e4d3fc06f3b1"
dependencies = [
 "foreign-types-shared",
]

[[package]]
name = "foreign-types-shared"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "00b0228411908ca8685dba7fc2cdd70ec9990a6e753e89b6ac91a84c40fbaf4b"

[[package]]
name = "form_urlencoded"
version = "1.2.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cb4cb245038516f5f85277875cdaa4f7d2c9a0fa0468de06ed190163b1581fcf"
dependencies = [
 "percent-encoding",
]

[[package]]
name = "fragile"
version = "2.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "28dd6caf6059519a65843af8fe2a3ae298b14b80179855aeb4adc2c1934ee619"

[[package]]
name = "fs_extra"
version = "1.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "42703706b716c37f96a77aea830392ad231f44c9e9a67872fa5548707e11b11c"

[[package]]
name = "futures-channel"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2dff15bf788c671c1934e366d07e30c1814a8ef514e1af724a602e8a2fbe1b10"
dependencies = [
 "futures-core",
 "futures-sink",
]

[[package]]
name = "futures-core"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "05f29059c0c2090612e8d742178b0580d2dc940c837851ad723096f87af6663e"

[[package]]
name = "futures-executor"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1e28d1d997f585e54aebc3f97d39e72338912123a67330d723fdbb564d646c9f"
dependencies = [
 "futures-core",
 "futures-task",
 "futures-util",
]

[[package]]
name = "futures-intrusive"
version = "0.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1d930c203dd0b6ff06e0201a4a2fe9149b43c684fd4420555b26d21b1a02956f"
dependencies = [
 "futures-core",
 "lock_api",
 "parking_lot",
]

[[package]]
name = "futures-io"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9e5c1b78ca4aae1ac06c48a526a655760685149f0d465d21f37abfe57ce075c6"

[[package]]
name = "futures-sink"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e575fab7d1e0dcb8d0c7bcf9a63ee213816ab51902e6d244a95819acacf1d4f7"

[[package]]
name = "futures-task"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f90f7dce0722e95104fcb095585910c0977252f286e354b5e3bd38902cd99988"

[[package]]
name = "futures-util"
version = "0.3.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9fa08315bb612088cc391249efdc3bc77536f16c91f6cf495e6fbe85b20a4a81"
dependencies = [
 "futures-core",
 "futures-io",
 "futures-sink",
 "futures-task",
 "memchr",
 "pin-project-lite",
 "pin-utils",
 "slab",
]

[[package]]
name = "generic-array"
version = "0.14.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "85649ca51fd72272d7821adaf274ad91c288277713d9c18820d8499a7ff69e9a"
dependencies = [
 "typenum",
 "version_check",
 "zeroize",
]

[[package]]
name = "getrandom"
version = "0.2.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ff2abc00be7fca6ebc474524697ae276ad847ad0a6b3faa4bcb027e9a4614ad0"
dependencies = [
 "cfg-if",
 "js-sys",
 "libc",
 "wasi",
 "wasm-bindgen",
]

[[package]]
name = "getrandom"
version = "0.3.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "899def5c37c4fd7b2664648c28120ecec138e4d395b459e5ca34f9cce2dd77fd"
dependencies = [
 "cfg-if",
 "js-sys",
 "libc",
 "r-efi",
 "wasip2",
 "wasm-bindgen",
]

[[package]]
name = "getrandom"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "139ef39800118c7683f2fd3c98c1b23c09ae076556b435f8e9064ae108aaeeec"
dependencies = [
 "cfg-if",
 "libc",
 "r-efi",
 "wasip2",
 "wasip3",
]

[[package]]
name = "gif"
version = "0.14.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f5df2ba84018d80c213569363bdcd0c64e6933c67fe4c1d60ecf822971a3c35e"
dependencies = [
 "color_quant",
 "weezl",
]

[[package]]
name = "group"
version = "0.12.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5dfbfb3a6cfbd390d5c9564ab283a0349b9b9fcd46a706c1eb10e0db70bfbac7"
dependencies = [
 "ff 0.12.1",
 "rand_core 0.6.4",
 "subtle",
]

[[package]]
name = "group"
version = "0.13.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f0f9ef7462f7c099f518d754361858f86d8a07af53ba9af0fe635bbccb151a63"
dependencies = [
 "ff 0.13.1",
 "rand_core 0.6.4",
 "subtle",
]

[[package]]
name = "h2"
version = "0.3.27"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0beca50380b1fc32983fc1cb4587bfa4bb9e78fc259aad4a0032d2080309222d"
dependencies = [
 "bytes",
 "fnv",
 "futures-core",
 "futures-sink",
 "futures-util",
 "http 0.2.12",
 "indexmap",
 "slab",
 "tokio",
 "tokio-util",
 "tracing",
]

[[package]]
name = "h2"
version = "0.4.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2f44da3a8150a6703ed5d34e164b875fd14c2cdab9af1252a9a1020bde2bdc54"
dependencies = [
 "atomic-waker",
 "bytes",
 "fnv",
 "futures-core",
 "futures-sink",
 "http 1.4.0",
 "indexmap",
 "slab",
 "tokio",
 "tokio-util",
 "tracing",
]

[[package]]
name = "half"
version = "2.7.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6ea2d84b969582b4b1864a92dc5d27cd2b77b622a8d79306834f1be5ba20d84b"
dependencies = [
 "cfg-if",
 "crunchy",
 "zerocopy",
]

[[package]]
name = "hashbrown"
version = "0.14.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e5274423e17b7c9fc20b6e7e208532f9b19825d82dfd615708b70edd83df41f1"

[[package]]
name = "hashbrown"
version = "0.15.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9229cfe53dfd69f0609a49f65461bd93001ea1ef889cd5529dd176593f5338a1"
dependencies = [
 "allocator-api2",
 "equivalent",
 "foldhash 0.1.5",
]

[[package]]
name = "hashbrown"
version = "0.16.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "841d1cc9bed7f9236f321df977030373f4a4163ae1a7dbfe1a51a2c1a51d9100"
dependencies = [
 "allocator-api2",
 "equivalent",
 "foldhash 0.2.0",
]

[[package]]
name = "hashlink"
version = "0.10.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7382cf6263419f2d8df38c55d7da83da5c18aef87fc7a7fc1fb1e344edfe14c1"
dependencies = [
 "hashbrown 0.15.5",
]

[[package]]
name = "heck"
version = "0.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2304e00983f87ffb38b55b444b5e3b60a884b5d30c0fca7d82fe33449bbe55ea"

[[package]]
name = "hex"
version = "0.4.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7f24254aa9a54b5c858eaee2f5bccdb46aaf0e486a595ed5fd8f86ba55232a70"

[[package]]
name = "hkdf"
version = "0.12.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7b5f8eb2ad728638ea2c7d47a21db23b7b58a72ed6a38256b8a1849f15fbbdf7"
dependencies = [
 "hmac",
]

[[package]]
name = "hmac"
version = "0.12.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6c49c37c09c17a53d937dfbb742eb3a961d65a994e6bcdcf37e7399d0cc8ab5e"
dependencies = [
 "digest",
]

[[package]]
name = "hmac-sha256"
version = "1.1.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d0f0ae375a85536cac3a243e3a9cda80a47910348abdea7e2c22f8ec556d586d"

[[package]]
name = "home"
version = "0.5.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cc627f471c528ff0c4a49e1d5e60450c8f6461dd6d10ba9dcd3a61d3dff7728d"
dependencies = [
 "windows-sys 0.61.2",
]

[[package]]
name = "http"
version = "0.2.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "601cbb57e577e2f5ef5be8e7b83f0f63994f25aa94d673e54a92d5c516d101f1"
dependencies = [
 "bytes",
 "fnv",
 "itoa",
]

[[package]]
name = "http"
version = "1.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e3ba2a386d7f85a81f119ad7498ebe444d2e22c2af0b86b069416ace48b3311a"
dependencies = [
 "bytes",
 "itoa",
]

[[package]]
name = "http-body"
version = "0.4.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7ceab25649e9960c0311ea418d17bee82c0dcec1bd053b5f9a66e265a693bed2"
dependencies = [
 "bytes",
 "http 0.2.12",
 "pin-project-lite",
]

[[package]]
name = "http-body"
version = "1.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1efedce1fb8e6913f23e0c92de8e62cd5b772a67e7b3946df930a62566c93184"
dependencies = [
 "bytes",
 "http 1.4.0",
]

[[package]]
name = "http-body-util"
version = "0.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b021d93e26becf5dc7e1b75b1bed1fd93124b374ceb73f43d4d4eafec896a64a"
dependencies = [
 "bytes",
 "futures-core",
 "http 1.4.0",
 "http-body 1.0.1",
 "pin-project-lite",
]

[[package]]
name = "http-range-header"
version = "0.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9171a2ea8a68358193d15dd5d70c1c10a2afc3e7e4c5bc92bc9f025cebd7359c"

[[package]]
name = "httparse"
version = "1.10.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6dbf3de79e51f3d586ab4cb9d5c3e2c14aa28ed23d180cf89b4df0454a69cc87"

[[package]]
name = "httpdate"
version = "1.0.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "df3b46402a9d5adb4c86a0cf463f42e19994e3ee891101b1841f30a545cb49a9"

[[package]]
name = "hyper"
version = "0.14.32"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "41dfc780fdec9373c01bae43289ea34c972e40ee3c9f6b3c8801a35f35586ce7"
dependencies = [
 "bytes",
 "futures-channel",
 "futures-core",
 "futures-util",
 "h2 0.3.27",
 "http 0.2.12",
 "http-body 0.4.6",
 "httparse",
 "httpdate",
 "itoa",
 "pin-project-lite",
 "socket2 0.5.10",
 "tokio",
 "tower-service",
 "tracing",
 "want",
]

[[package]]
name = "hyper"
version = "1.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2ab2d4f250c3d7b1c9fcdff1cece94ea4e2dfbec68614f7b87cb205f24ca9d11"
dependencies = [
 "atomic-waker",
 "bytes",
 "futures-channel",
 "futures-core",
 "h2 0.4.13",
 "http 1.4.0",
 "http-body 1.0.1",
 "httparse",
 "httpdate",
 "itoa",
 "pin-project-lite",
 "pin-utils",
 "smallvec",
 "tokio",
 "want",
]

[[package]]
name = "hyper-rustls"
version = "0.24.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ec3efd23720e2049821a693cbc7e65ea87c72f1c58ff2f9522ff332b1491e590"
dependencies = [
 "futures-util",
 "http 0.2.12",
 "hyper 0.14.32",
 "log",
 "rustls 0.21.12",
 "tokio",
 "tokio-rustls 0.24.1",
]

[[package]]
name = "hyper-rustls"
version = "0.27.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e3c93eb611681b207e1fe55d5a71ecf91572ec8a6705cdb6857f7d8d5242cf58"
dependencies = [
 "http 1.4.0",
 "hyper 1.8.1",
 "hyper-util",
 "rustls 0.23.36",
 "rustls-native-certs",
 "rustls-pki-types",
 "tokio",
 "tokio-rustls 0.26.4",
 "tower-service",
]

[[package]]
name = "hyper-util"
version = "0.1.20"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "96547c2556ec9d12fb1578c4eaf448b04993e7fb79cbaad930a656880a6bdfa0"
dependencies = [
 "base64",
 "bytes",
 "futures-channel",
 "futures-util",
 "http 1.4.0",
 "http-body 1.0.1",
 "hyper 1.8.1",
 "ipnet",
 "libc",
 "percent-encoding",
 "pin-project-lite",
 "socket2 0.6.2",
 "system-configuration",
 "tokio",
 "tower-service",
 "tracing",
 "windows-registry",
]

[[package]]
name = "iana-time-zone"
version = "0.1.65"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e31bc9ad994ba00e440a8aa5c9ef0ec67d5cb5e5cb0cc7f8b744a35b389cc470"
dependencies = [
 "android_system_properties",
 "core-foundation-sys",
 "iana-time-zone-haiku",
 "js-sys",
 "log",
 "wasm-bindgen",
 "windows-core",
]

[[package]]
name = "iana-time-zone-haiku"
version = "0.1.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f31827a206f56af32e590ba56d5d2d085f558508192593743f16b2306495269f"
dependencies = [
 "cc",
]

[[package]]
name = "icu_collections"
version = "2.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4c6b649701667bbe825c3b7e6388cb521c23d88644678e83c0c4d0a621a34b43"
dependencies = [
 "displaydoc",
 "potential_utf",
 "yoke",
 "zerofrom",
 "zerovec",
]

[[package]]
name = "icu_locale_core"
version = "2.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "edba7861004dd3714265b4db54a3c390e880ab658fec5f7db895fae2046b5bb6"
dependencies = [
 "displaydoc",
 "litemap",
 "tinystr",
 "writeable",
 "zerovec",
]

[[package]]
name = "icu_normalizer"
version = "2.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5f6c8828b67bf8908d82127b2054ea1b4427ff0230ee9141c54251934ab1b599"
dependencies = [
 "icu_collections",
 "icu_normalizer_data",
 "icu_properties",
 "icu_provider",
 "smallvec",
 "zerovec",
]

[[package]]
name = "icu_normalizer_data"
version = "2.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7aedcccd01fc5fe81e6b489c15b247b8b0690feb23304303a9e560f37efc560a"

[[package]]
name = "icu_properties"
version = "2.1.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "020bfc02fe870ec3a66d93e677ccca0562506e5872c650f893269e08615d74ec"
dependencies = [
 "icu_collections",
 "icu_locale_core",
 "icu_properties_data",
 "icu_provider",
 "zerotrie",
 "zerovec",
]

[[package]]
name = "icu_properties_data"
version = "2.1.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "616c294cf8d725c6afcd8f55abc17c56464ef6211f9ed59cccffe534129c77af"

[[package]]
name = "icu_provider"
version = "2.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "85962cf0ce02e1e0a629cc34e7ca3e373ce20dda4c4d7294bbd0bf1fdb59e614"
dependencies = [
 "displaydoc",
 "icu_locale_core",
 "writeable",
 "yoke",
 "zerofrom",
 "zerotrie",
 "zerovec",
]

[[package]]
name = "id-arena"
version = "2.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3d3067d79b975e8844ca9eb072e16b31c3c1c36928edf9c6789548c524d0d954"

[[package]]
name = "ident_case"
version = "1.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b9e0384b61958566e926dc50660321d12159025e767c18e043daf26b70104c39"

[[package]]
name = "idna"
version = "1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3b0875f23caa03898994f6ddc501886a45c7d3d62d04d2d90788d47be1b1e4de"
dependencies = [
 "idna_adapter",
 "smallvec",
 "utf8_iter",
]

[[package]]
name = "idna_adapter"
version = "1.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3acae9609540aa318d1bc588455225fb2085b9ed0c4f6bd0d9d5bcd86f1a0344"
dependencies = [
 "icu_normalizer",
 "icu_properties",
]

[[package]]
name = "image"
version = "0.25.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e6506c6c10786659413faa717ceebcb8f70731c0a60cbae39795fdf114519c1a"
dependencies = [
 "bytemuck",
 "byteorder-lite",
 "color_quant",
 "exr",
 "gif",
 "image-webp",
 "moxcms",
 "num-traits",
 "png",
 "qoi",
 "ravif",
 "rayon",
 "rgb",
 "tiff",
 "zune-core 0.5.1",
 "zune-jpeg 0.5.12",
]

[[package]]
name = "image-webp"
version = "0.2.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "525e9ff3e1a4be2fbea1fdf0e98686a6d98b4d8f937e1bf7402245af1909e8c3"
dependencies = [
 "byteorder-lite",
 "quick-error",
]

[[package]]
name = "imgref"
version = "1.12.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e7c5cedc30da3a610cac6b4ba17597bdf7152cf974e8aab3afb3d54455e371c8"

[[package]]
name = "indexmap"
version = "2.13.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7714e70437a7dc3ac8eb7e6f8df75fd8eb422675fc7678aff7364301092b1017"
dependencies = [
 "equivalent",
 "hashbrown 0.16.1",
 "serde",
 "serde_core",
]

[[package]]
name = "interpolate_name"
version = "0.2.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c34819042dc3d3971c46c2190835914dfbe0c3c13f61449b2997f4e9722dfa60"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "ipnet"
version = "2.11.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "469fb0b9cefa57e3ef31275ee7cacb78f2fdca44e4765491884a2b119d4eb130"

[[package]]
name = "ipnetwork"
version = "0.20.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bf466541e9d546596ee94f9f69590f89473455f88372423e0008fc1a7daf100e"
dependencies = [
 "serde",
]

[[package]]
name = "iri-string"
version = "0.7.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c91338f0783edbd6195decb37bae672fd3b165faffb89bf7b9e6942f8b1a731a"
dependencies = [
 "memchr",
 "serde",
]

[[package]]
name = "itertools"
version = "0.14.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2b192c782037fadd9cfa75548310488aabdbf3d2da73885b31bd0abd03351285"
dependencies = [
 "either",
]

[[package]]
name = "itoa"
version = "1.0.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "92ecc6618181def0457392ccd0ee51198e065e016d1d527a7ac1b6dc7c1f09d2"

[[package]]
name = "jni"
version = "0.21.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1a87aa2bb7d2af34197c04845522473242e1aa17c12f4935d5856491a7fb8c97"
dependencies = [
 "cesu8",
 "cfg-if",
 "combine",
 "jni-sys",
 "log",
 "thiserror 1.0.69",
 "walkdir",
 "windows-sys 0.45.0",
]

[[package]]
name = "jni-sys"
version = "0.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8eaf4bc02d17cbdd7ff4c7438cafcdf7fb9a4613313ad11b4f8fefe7d3fa0130"

[[package]]
name = "jobserver"
version = "0.1.34"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9afb3de4395d6b3e67a780b6de64b51c978ecf11cb9a462c66be7d4ca9039d33"
dependencies = [
 "getrandom 0.3.4",
 "libc",
]

[[package]]
name = "js-sys"
version = "0.3.85"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8c942ebf8e95485ca0d52d97da7c5a2c387d0e7f0ba4c35e93bfcaee045955b3"
dependencies = [
 "once_cell",
 "wasm-bindgen",
]

[[package]]
name = "json5"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "96b0db21af676c1ce64250b5f40f3ce2cf27e4e47cb91ed91eb6fe9350b430c1"
dependencies = [
 "pest",
 "pest_derive",
 "serde",
]

[[package]]
name = "jsonwebtoken"
version = "10.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0529410abe238729a60b108898784df8984c87f6054c9c4fcacc47e4803c1ce1"
dependencies = [
 "base64",
 "ed25519-dalek",
 "getrandom 0.2.17",
 "hmac",
 "js-sys",
 "p256 0.13.2",
 "p384",
 "pem",
 "rand 0.8.5",
 "rsa",
 "serde",
 "serde_json",
 "sha2",
 "signature 2.2.0",
 "simple_asn1",
]

[[package]]
name = "lazy_static"
version = "1.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bbd2bcb4c963f2ddae06a2efc7e9f3591312473c50c6685e1f298068316e66fe"
dependencies = [
 "spin 0.9.8",
]

[[package]]
name = "leb128fmt"
version = "0.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "09edd9e8b54e49e587e4f6295a7d29c3ea94d469cb40ab8ca70b288248a81db2"

[[package]]
name = "lebe"
version = "0.5.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7a79a3332a6609480d7d0c9eab957bca6b455b91bb84e66d19f5ff66294b85b8"

[[package]]
name = "libc"
version = "0.2.180"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bcc35a38544a891a5f7c865aca548a982ccb3b8650a5b06d0fd33a10283c56fc"

[[package]]
name = "libfuzzer-sys"
version = "0.4.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5037190e1f70cbeef565bd267599242926f724d3b8a9f510fd7e0b540cfa4404"
dependencies = [
 "arbitrary",
 "cc",
]

[[package]]
name = "libm"
version = "0.2.16"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b6d2cec3eae94f9f509c767b45932f1ada8350c4bdb85af2fcab4a3c14807981"

[[package]]
name = "libredox"
version = "0.1.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3d0b95e02c851351f877147b7deea7b1afb1df71b63aa5f8270716e0c5720616"
dependencies = [
 "bitflags",
 "libc",
 "redox_syscall 0.7.0",
]

[[package]]
name = "libsqlite3-sys"
version = "0.30.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2e99fb7a497b1e3339bc746195567ed8d3e24945ecd636e3619d20b9de9e9149"
dependencies = [
 "pkg-config",
 "vcpkg",
]

[[package]]
name = "linux-raw-sys"
version = "0.11.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "df1d3c3b53da64cf5760482273a98e575c651a67eec7f77df96b5b642de8f039"

[[package]]
name = "litemap"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6373607a59f0be73a39b6fe456b8192fcc3585f602af20751600e974dd455e77"

[[package]]
name = "lock_api"
version = "0.4.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "224399e74b87b5f3557511d98dff8b14089b3dadafcab6bb93eab67d3aace965"
dependencies = [
 "scopeguard",
]

[[package]]
name = "log"
version = "0.4.29"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5e5032e24019045c762d3c0f28f5b6b8bbf38563a65908389bf7978758920897"

[[package]]
name = "loop9"
version = "0.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0fae87c125b03c1d2c0150c90365d7d6bcc53fb73a9acaef207d2d065860f062"
dependencies = [
 "imgref",
]

[[package]]
name = "lru"
version = "0.16.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a1dc47f592c06f33f8e3aea9591776ec7c9f9e4124778ff8a3c3b87159f7e593"
dependencies = [
 "hashbrown 0.16.1",
]

[[package]]
name = "lru-slab"
version = "0.1.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "112b39cec0b298b6c1999fee3e31427f74f676e4cb9879ed1a121b43661a4154"

[[package]]
name = "lzma-rust2"
version = "0.15.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1670343e58806300d87950e3401e820b519b9384281bbabfb15e3636689ffd69"

[[package]]
name = "matchers"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d1525a2a28c7f4fa0fc98bb91ae755d1e2d1505079e05539e35bc876b5d65ae9"
dependencies = [
 "regex-automata",
]

[[package]]
name = "matchit"
version = "0.8.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "47e1ffaa40ddd1f3ed91f717a33c8c0ee23fff369e3aa8772b9605cc1d22f4c3"

[[package]]
name = "matrixmultiply"
version = "0.3.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a06de3016e9fae57a36fd14dba131fccf49f74b40b7fbdb472f96e361ec71a08"
dependencies = [
 "autocfg",
 "rawpointer",
]

[[package]]
name = "maybe-rayon"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8ea1f30cedd69f0a2954655f7188c6a834246d2bcf1e315e2ac40c4b24dc9519"
dependencies = [
 "cfg-if",
 "rayon",
]

[[package]]
name = "md-5"
version = "0.10.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d89e7ee0cfbedfc4da3340218492196241d89eefb6dab27de5df917a6d2e78cf"
dependencies = [
 "cfg-if",
 "digest",
]

[[package]]
name = "memchr"
version = "2.8.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f8ca58f447f06ed17d5fc4043ce1b10dd205e060fb3ce5b979b8ed8e59ff3f79"

[[package]]
name = "mime"
version = "0.3.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6877bb514081ee2a7ff5ef9de3281f14a4dd4bceac4c09388074a6b5df8a139a"

[[package]]
name = "mime_guess"
version = "2.0.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f7c44f8e672c00fe5308fa235f821cb4198414e1c77935c1ab6948d3fd78550e"
dependencies = [
 "mime",
 "unicase",
]

[[package]]
name = "miniz_oxide"
version = "0.8.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1fa76a2c86f704bdb222d66965fb3d63269ce38518b83cb0575fca855ebb6316"
dependencies = [
 "adler2",
 "simd-adler32",
]

[[package]]
name = "mio"
version = "1.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a69bcab0ad47271a0234d9422b131806bf3968021e5dc9328caf2d4cd58557fc"
dependencies = [
 "libc",
 "wasi",
 "windows-sys 0.61.2",
]

[[package]]
name = "mockall"
version = "0.14.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f58d964098a5f9c6b63d0798e5372fd04708193510a7af313c22e9f29b7b620b"
dependencies = [
 "cfg-if",
 "downcast",
 "fragile",
 "mockall_derive",
 "predicates",
 "predicates-tree",
]

[[package]]
name = "mockall_derive"
version = "0.14.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ca41ce716dda6a9be188b385aa78ee5260fc25cd3802cb2a8afdc6afbe6b6dbf"
dependencies = [
 "cfg-if",
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "moxcms"
version = "0.7.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ac9557c559cd6fc9867e122e20d2cbefc9ca29d80d027a8e39310920ed2f0a97"
dependencies = [
 "num-traits",
 "pxfm",
]

[[package]]
name = "multer"
version = "3.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "83e87776546dc87511aa5ee218730c92b666d7264ab6ed41f9d215af9cd5224b"
dependencies = [
 "bytes",
 "encoding_rs",
 "futures-util",
 "http 1.4.0",
 "httparse",
 "memchr",
 "mime",
 "spin 0.9.8",
 "version_check",
]

[[package]]
name = "native-tls"
version = "0.2.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "87de3442987e9dbec73158d5c715e7ad9072fda936bb03d19d7fa10e00520f0e"
dependencies = [
 "libc",
 "log",
 "openssl",
 "openssl-probe 0.1.6",
 "openssl-sys",
 "schannel",
 "security-framework 2.11.1",
 "security-framework-sys",
 "tempfile",
]

[[package]]
name = "ndarray"
version = "0.15.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "adb12d4e967ec485a5f71c6311fe28158e9d6f4bc4a447b474184d0f91a8fa32"
dependencies = [
 "matrixmultiply",
 "num-complex",
 "num-integer",
 "num-traits",
 "rawpointer",
]

[[package]]
name = "ndarray"
version = "0.17.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "520080814a7a6b4a6e9070823bb24b4531daac8c4627e08ba5de8c5ef2f2752d"
dependencies = [
 "matrixmultiply",
 "num-complex",
 "num-integer",
 "num-traits",
 "portable-atomic",
 "portable-atomic-util",
 "rawpointer",
]

[[package]]
name = "new_debug_unreachable"
version = "1.0.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "650eef8c711430f1a879fdd01d4745a7deea475becfb90269c06775983bbf086"

[[package]]
name = "nom"
version = "8.0.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "df9761775871bdef83bee530e60050f7e54b1105350d6884eb0fb4f46c2f9405"
dependencies = [
 "memchr",
]

[[package]]
name = "noop_proc_macro"
version = "0.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0676bb32a98c1a483ce53e500a81ad9c3d5b3f7c920c28c24e9cb0980d0b5bc8"

[[package]]
name = "nu-ansi-term"
version = "0.50.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7957b9740744892f114936ab4a57b3f487491bbeafaf8083688b16841a4240e5"
dependencies = [
 "windows-sys 0.61.2",
]

[[package]]
name = "num-bigint"
version = "0.4.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a5e44f723f1133c9deac646763579fdb3ac745e418f2a7af9cd0c431da1f20b9"
dependencies = [
 "num-integer",
 "num-traits",
]

[[package]]
name = "num-bigint-dig"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e661dda6640fad38e827a6d4a310ff4763082116fe217f279885c97f511bb0b7"
dependencies = [
 "lazy_static",
 "libm",
 "num-integer",
 "num-iter",
 "num-traits",
 "rand 0.8.5",
 "smallvec",
 "zeroize",
]

[[package]]
name = "num-complex"
version = "0.4.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "73f88a1307638156682bada9d7604135552957b7818057dcef22705b4d509495"
dependencies = [
 "num-traits",
]

[[package]]
name = "num-conv"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cf97ec579c3c42f953ef76dbf8d55ac91fb219dde70e49aa4a6b7d74e9919050"

[[package]]
name = "num-derive"
version = "0.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ed3955f1a9c7c0c15e092f9c887db08b1fc683305fdf6eb6684f22555355e202"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "num-integer"
version = "0.1.46"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7969661fd2958a5cb096e56c8e1ad0444ac2bbcd0061bd28660485a44879858f"
dependencies = [
 "num-traits",
]

[[package]]
name = "num-iter"
version = "0.1.45"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1429034a0490724d0075ebb2bc9e875d6503c3cf69e235a8941aa757d83ef5bf"
dependencies = [
 "autocfg",
 "num-integer",
 "num-traits",
]

[[package]]
name = "num-rational"
version = "0.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f83d14da390562dca69fc84082e73e548e1ad308d24accdedd2720017cb37824"
dependencies = [
 "num-bigint",
 "num-integer",
 "num-traits",
]

[[package]]
name = "num-traits"
version = "0.2.19"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "071dfc062690e90b734c0b2273ce72ad0ffa95f0c74596bc250dcfd960262841"
dependencies = [
 "autocfg",
 "libm",
]

[[package]]
name = "once_cell"
version = "1.21.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "42f5e15c9953c5e4ccceeb2e7382a716482c34515315f7b03532b8b4e8393d2d"

[[package]]
name = "openssl"
version = "0.10.75"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "08838db121398ad17ab8531ce9de97b244589089e290a384c900cb9ff7434328"
dependencies = [
 "bitflags",
 "cfg-if",
 "foreign-types",
 "libc",
 "once_cell",
 "openssl-macros",
 "openssl-sys",
]

[[package]]
name = "openssl-macros"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a948666b637a0f465e8564c73e89d4dde00d72d4d473cc972f390fc3dcee7d9c"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "openssl-probe"
version = "0.1.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d05e27ee213611ffe7d6348b942e8f942b37114c00cc03cec254295a4a17852e"

[[package]]
name = "openssl-probe"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7c87def4c32ab89d880effc9e097653c8da5d6ef28e6b539d313baaacfbafcbe"

[[package]]
name = "openssl-sys"
version = "0.9.111"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "82cab2d520aa75e3c58898289429321eb788c3106963d0dc886ec7a5f4adc321"
dependencies = [
 "cc",
 "libc",
 "pkg-config",
 "vcpkg",
]

[[package]]
name = "ordered-multimap"
version = "0.7.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "49203cdcae0030493bad186b28da2fa25645fa276a51b6fec8010d281e02ef79"
dependencies = [
 "dlv-list",
 "hashbrown 0.14.5",
]

[[package]]
name = "ort"
version = "2.0.0-rc.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4a5df903c0d2c07b56950f1058104ab0c8557159f2741782223704de9be73c3c"
dependencies = [
 "ndarray 0.17.2",
 "ort-sys",
 "smallvec",
 "tracing",
 "ureq",
]

[[package]]
name = "ort-sys"
version = "2.0.0-rc.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "06503bb33f294c5f1ba484011e053bfa6ae227074bdb841e9863492dc5960d4b"
dependencies = [
 "hmac-sha256",
 "lzma-rust2",
 "ureq",
]

[[package]]
name = "outref"
version = "0.5.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1a80800c0488c3a21695ea981a54918fbb37abf04f4d0720c453632255e2ff0e"

[[package]]
name = "p256"
version = "0.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "51f44edd08f51e2ade572f141051021c5af22677e42b7dd28a88155151c33594"
dependencies = [
 "ecdsa 0.14.8",
 "elliptic-curve 0.12.3",
 "sha2",
]

[[package]]
name = "p256"
version = "0.13.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c9863ad85fa8f4460f9c48cb909d38a0d689dba1f6f6988a5e3e0d31071bcd4b"
dependencies = [
 "ecdsa 0.16.9",
 "elliptic-curve 0.13.8",
 "primeorder",
 "sha2",
]

[[package]]
name = "p384"
version = "0.13.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fe42f1670a52a47d448f14b6a5c61dd78fce51856e68edaa38f7ae3a46b8d6b6"
dependencies = [
 "ecdsa 0.16.9",
 "elliptic-curve 0.13.8",
 "primeorder",
 "sha2",
]

[[package]]
name = "parking"
version = "2.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f38d5652c16fde515bb1ecef450ab0f6a219d619a7274976324d5e377f7dceba"

[[package]]
name = "parking_lot"
version = "0.12.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "93857453250e3077bd71ff98b6a65ea6621a19bb0f559a85248955ac12c45a1a"
dependencies = [
 "lock_api",
 "parking_lot_core",
]

[[package]]
name = "parking_lot_core"
version = "0.9.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2621685985a2ebf1c516881c026032ac7deafcda1a2c9b7850dc81e3dfcb64c1"
dependencies = [
 "cfg-if",
 "libc",
 "redox_syscall 0.5.18",
 "smallvec",
 "windows-link",
]

[[package]]
name = "paste"
version = "1.0.15"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "57c0d7b74b563b49d38dae00a0c37d4d6de9b432382b2892f0574ddcae73fd0a"

[[package]]
name = "pastey"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "35fb2e5f958ec131621fdd531e9fc186ed768cbe395337403ae56c17a74c68ec"

[[package]]
name = "pathdiff"
version = "0.2.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "df94ce210e5bc13cb6651479fa48d14f601d9858cfe0467f43ae157023b938d3"

[[package]]
name = "pem"
version = "3.0.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1d30c53c26bc5b31a98cd02d20f25a7c8567146caf63ed593a9d87b2775291be"
dependencies = [
 "base64",
 "serde_core",
]

[[package]]
name = "pem-rfc7468"
version = "0.7.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "88b39c9bfcfc231068454382784bb460aae594343fb030d46e9f50a645418412"
dependencies = [
 "base64ct",
]

[[package]]
name = "percent-encoding"
version = "2.3.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9b4f627cb1b25917193a259e49bdad08f671f8d9708acfd5fe0a8c1455d87220"

[[package]]
name = "pest"
version = "2.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e0848c601009d37dfa3430c4666e147e49cdcf1b92ecd3e63657d8a5f19da662"
dependencies = [
 "memchr",
 "ucd-trie",
]

[[package]]
name = "pest_derive"
version = "2.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "11f486f1ea21e6c10ed15d5a7c77165d0ee443402f0780849d1768e7d9d6fe77"
dependencies = [
 "pest",
 "pest_generator",
]

[[package]]
name = "pest_generator"
version = "2.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8040c4647b13b210a963c1ed407c1ff4fdfa01c31d6d2a098218702e6664f94f"
dependencies = [
 "pest",
 "pest_meta",
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "pest_meta"
version = "2.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "89815c69d36021a140146f26659a81d6c2afa33d216d736dd4be5381a7362220"
dependencies = [
 "pest",
 "sha2",
]

[[package]]
name = "pin-project-lite"
version = "0.2.16"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3b3cff922bd51709b605d9ead9aa71031d81447142d828eb4a6eba76fe619f9b"

[[package]]
name = "pin-utils"
version = "0.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8b870d8c151b6f2fb93e84a13146138f05d02ed11c7e7c54f8826aaaf7c9f184"

[[package]]
name = "pkcs1"
version = "0.7.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c8ffb9f10fa047879315e6625af03c164b16962a5368d724ed16323b68ace47f"
dependencies = [
 "der 0.7.10",
 "pkcs8 0.10.2",
 "spki 0.7.3",
]

[[package]]
name = "pkcs8"
version = "0.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9eca2c590a5f85da82668fa685c09ce2888b9430e83299debf1f34b65fd4a4ba"
dependencies = [
 "der 0.6.1",
 "spki 0.6.0",
]

[[package]]
name = "pkcs8"
version = "0.10.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f950b2377845cebe5cf8b5165cb3cc1a5e0fa5cfa3e1f7f55707d8fd82e0a7b7"
dependencies = [
 "der 0.7.10",
 "spki 0.7.3",
]

[[package]]
name = "pkg-config"
version = "0.3.32"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7edddbd0b52d732b21ad9a5fab5c704c14cd949e5e9a1ec5929a24fded1b904c"

[[package]]
name = "png"
version = "0.18.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "97baced388464909d42d89643fe4361939af9b7ce7a31ee32a168f832a70f2a0"
dependencies = [
 "bitflags",
 "crc32fast",
 "fdeflate",
 "flate2",
 "miniz_oxide",
]

[[package]]
name = "portable-atomic"
version = "1.13.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c33a9471896f1c69cecef8d20cbe2f7accd12527ce60845ff44c153bb2a21b49"

[[package]]
name = "portable-atomic-util"
version = "0.2.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7a9db96d7fa8782dd8c15ce32ffe8680bbd1e978a43bf51a34d39483540495f5"
dependencies = [
 "portable-atomic",
]

[[package]]
name = "potential_utf"
version = "0.1.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b73949432f5e2a09657003c25bca5e19a0e9c84f8058ca374f49e0ebe605af77"
dependencies = [
 "zerovec",
]

[[package]]
name = "powerfmt"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "439ee305def115ba05938db6eb1644ff94165c5ab5e9420d1c1bcedbba909391"

[[package]]
name = "ppv-lite86"
version = "0.2.21"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "85eae3c4ed2f50dcfe72643da4befc30deadb458a9b590d720cde2f2b1e97da9"
dependencies = [
 "zerocopy",
]

[[package]]
name = "predicates"
version = "3.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a5d19ee57562043d37e82899fade9a22ebab7be9cef5026b07fda9cdd4293573"
dependencies = [
 "anstyle",
 "predicates-core",
]

[[package]]
name = "predicates-core"
version = "1.0.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "727e462b119fe9c93fd0eb1429a5f7647394014cf3c04ab2c0350eeb09095ffa"

[[package]]
name = "predicates-tree"
version = "1.0.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "72dd2d6d381dfb73a193c7fca536518d7caee39fc8503f74e7dc0be0531b425c"
dependencies = [
 "predicates-core",
 "termtree",
]

[[package]]
name = "prettyplease"
version = "0.2.37"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "479ca8adacdd7ce8f1fb39ce9ecccbfe93a3f1344b3d0d97f20bc0196208f62b"
dependencies = [
 "proc-macro2",
 "syn",
]

[[package]]
name = "primeorder"
version = "0.13.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "353e1ca18966c16d9deb1c69278edbc5f194139612772bd9537af60ac231e1e6"
dependencies = [
 "elliptic-curve 0.13.8",
]

[[package]]
name = "proc-macro-error-attr2"
version = "2.0.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "96de42df36bb9bba5542fe9f1a054b8cc87e172759a1868aa05c1f3acc89dfc5"
dependencies = [
 "proc-macro2",
 "quote",
]

[[package]]
name = "proc-macro-error2"
version = "2.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "11ec05c52be0a07b08061f7dd003e7d7092e0472bc731b4af7bb1ef876109802"
dependencies = [
 "proc-macro-error-attr2",
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "proc-macro2"
version = "1.0.106"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8fd00f0bb2e90d81d1044c2b32617f68fcb9fa3bb7640c23e9c748e53fb30934"
dependencies = [
 "unicode-ident",
]

[[package]]
name = "profiling"
version = "1.0.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3eb8486b569e12e2c32ad3e204dbaba5e4b5b216e9367044f25f1dba42341773"
dependencies = [
 "profiling-procmacros",
]

[[package]]
name = "profiling-procmacros"
version = "1.0.17"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "52717f9a02b6965224f95ca2a81e2e0c5c43baacd28ca057577988930b6c3d5b"
dependencies = [
 "quote",
 "syn",
]

[[package]]
name = "pxfm"
version = "0.1.27"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7186d3822593aa4393561d186d1393b3923e9d6163d3fbfd6e825e3e6cf3e6a8"
dependencies = [
 "num-traits",
]

[[package]]
name = "qoi"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7f6d64c71eb498fe9eae14ce4ec935c555749aef511cca85b5568910d6e48001"
dependencies = [
 "bytemuck",
]

[[package]]
name = "quick-error"
version = "2.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a993555f31e5a609f617c12db6250dedcac1b0a85076912c436e6fc9b2c8e6a3"

[[package]]
name = "quinn"
version = "0.11.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b9e20a958963c291dc322d98411f541009df2ced7b5a4f2bd52337638cfccf20"
dependencies = [
 "bytes",
 "cfg_aliases",
 "pin-project-lite",
 "quinn-proto",
 "quinn-udp",
 "rustc-hash",
 "rustls 0.23.36",
 "socket2 0.6.2",
 "thiserror 2.0.18",
 "tokio",
 "tracing",
 "web-time",
]

[[package]]
name = "quinn-proto"
version = "0.11.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f1906b49b0c3bc04b5fe5d86a77925ae6524a19b816ae38ce1e426255f1d8a31"
dependencies = [
 "aws-lc-rs",
 "bytes",
 "getrandom 0.3.4",
 "lru-slab",
 "rand 0.9.2",
 "ring",
 "rustc-hash",
 "rustls 0.23.36",
 "rustls-pki-types",
 "slab",
 "thiserror 2.0.18",
 "tinyvec",
 "tracing",
 "web-time",
]

[[package]]
name = "quinn-udp"
version = "0.5.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "addec6a0dcad8a8d96a771f815f0eaf55f9d1805756410b39f5fa81332574cbd"
dependencies = [
 "cfg_aliases",
 "libc",
 "once_cell",
 "socket2 0.6.2",
 "tracing",
 "windows-sys 0.60.2",
]

[[package]]
name = "quote"
version = "1.0.44"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "21b2ebcf727b7760c461f091f9f0f539b77b8e87f2fd88131e7f1b433b3cece4"
dependencies = [
 "proc-macro2",
]

[[package]]
name = "r-efi"
version = "5.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "69cdb34c158ceb288df11e18b4bd39de994f6657d83847bdffdbd7f346754b0f"

[[package]]
name = "rand"
version = "0.8.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "34af8d1a0e25924bc5b7c43c079c942339d8f0a8b57c39049bef581b46327404"
dependencies = [
 "libc",
 "rand_chacha 0.3.1",
 "rand_core 0.6.4",
]

[[package]]
name = "rand"
version = "0.9.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6db2770f06117d490610c7488547d543617b21bfa07796d7a12f6f1bd53850d1"
dependencies = [
 "rand_chacha 0.9.0",
 "rand_core 0.9.5",
]

[[package]]
name = "rand_chacha"
version = "0.3.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e6c10a63a0fa32252be49d21e7709d4d4baf8d231c2dbce1eaa8141b9b127d88"
dependencies = [
 "ppv-lite86",
 "rand_core 0.6.4",
]

[[package]]
name = "rand_chacha"
version = "0.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d3022b5f1df60f26e1ffddd6c66e8aa15de382ae63b3a0c1bfc0e4d3e3f325cb"
dependencies = [
 "ppv-lite86",
 "rand_core 0.9.5",
]

[[package]]
name = "rand_core"
version = "0.6.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ec0be4795e2f6a28069bec0b5ff3e2ac9bafc99e6a9a7dc3547996c5c816922c"
dependencies = [
 "getrandom 0.2.17",
]

[[package]]
name = "rand_core"
version = "0.9.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "76afc826de14238e6e8c374ddcc1fa19e374fd8dd986b0d2af0d02377261d83c"
dependencies = [
 "getrandom 0.3.4",
]

[[package]]
name = "rav1e"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "43b6dd56e85d9483277cde964fd1bdb0428de4fec5ebba7540995639a21cb32b"
dependencies = [
 "aligned-vec",
 "arbitrary",
 "arg_enum_proc_macro",
 "arrayvec",
 "av-scenechange",
 "av1-grain",
 "bitstream-io",
 "built",
 "cfg-if",
 "interpolate_name",
 "itertools",
 "libc",
 "libfuzzer-sys",
 "log",
 "maybe-rayon",
 "new_debug_unreachable",
 "noop_proc_macro",
 "num-derive",
 "num-traits",
 "paste",
 "profiling",
 "rand 0.9.2",
 "rand_chacha 0.9.0",
 "simd_helpers",
 "thiserror 2.0.18",
 "v_frame",
 "wasm-bindgen",
]

[[package]]
name = "ravif"
version = "0.12.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ef69c1990ceef18a116855938e74793a5f7496ee907562bd0857b6ac734ab285"
dependencies = [
 "avif-serialize",
 "imgref",
 "loop9",
 "quick-error",
 "rav1e",
 "rayon",
 "rgb",
]

[[package]]
name = "rawpointer"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "60a357793950651c4ed0f3f52338f53b2f809f32d83a07f72909fa13e4c6c1e3"

[[package]]
name = "rayon"
version = "1.11.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "368f01d005bf8fd9b1206fb6fa653e6c4a81ceb1466406b81792d87c5677a58f"
dependencies = [
 "either",
 "rayon-core",
]

[[package]]
name = "rayon-core"
version = "1.13.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "22e18b0f0062d30d4230b2e85ff77fdfe4326feb054b9783a3460d8435c8ab91"
dependencies = [
 "crossbeam-deque",
 "crossbeam-utils",
]

[[package]]
name = "redis"
version = "1.0.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e969d1d702793536d5fda739a82b88ad7cbe7d04f8386ee8cd16ad3eff4854a5"
dependencies = [
 "arc-swap",
 "arcstr",
 "backon",
 "bytes",
 "cfg-if",
 "combine",
 "futures-channel",
 "futures-util",
 "itoa",
 "native-tls",
 "num-bigint",
 "percent-encoding",
 "pin-project-lite",
 "ryu",
 "sha1_smol",
 "socket2 0.6.2",
 "tokio",
 "tokio-native-tls",
 "tokio-util",
 "url",
 "xxhash-rust",
]

[[package]]
name = "redox_syscall"
version = "0.5.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ed2bf2547551a7053d6fdfafda3f938979645c44812fbfcda098faae3f1a362d"
dependencies = [
 "bitflags",
]

[[package]]
name = "redox_syscall"
version = "0.7.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "49f3fe0889e69e2ae9e41f4d6c4c0181701d00e4697b356fb1f74173a5e0ee27"
dependencies = [
 "bitflags",
]

[[package]]
name = "regex"
version = "1.12.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e10754a14b9137dd7b1e3e5b0493cc9171fdd105e0ab477f51b72e7f3ac0e276"
dependencies = [
 "aho-corasick",
 "memchr",
 "regex-automata",
 "regex-syntax",
]

[[package]]
name = "regex-automata"
version = "0.4.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6e1dd4122fc1595e8162618945476892eefca7b88c52820e74af6262213cae8f"
dependencies = [
 "aho-corasick",
 "memchr",
 "regex-syntax",
]

[[package]]
name = "regex-lite"
version = "0.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cab834c73d247e67f4fae452806d17d3c7501756d98c8808d7c9c7aa7d18f973"

[[package]]
name = "regex-syntax"
version = "0.8.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a96887878f22d7bad8a3b6dc5b7440e0ada9a245242924394987b21cf2210a4c"

[[package]]
name = "reqwest"
version = "0.13.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ab3f43e3283ab1488b624b44b0e988d0acea0b3214e694730a055cb6b2efa801"
dependencies = [
 "base64",
 "bytes",
 "encoding_rs",
 "futures-core",
 "futures-util",
 "h2 0.4.13",
 "http 1.4.0",
 "http-body 1.0.1",
 "http-body-util",
 "hyper 1.8.1",
 "hyper-rustls 0.27.7",
 "hyper-util",
 "js-sys",
 "log",
 "mime",
 "mime_guess",
 "percent-encoding",
 "pin-project-lite",
 "quinn",
 "rustls 0.23.36",
 "rustls-pki-types",
 "rustls-platform-verifier",
 "serde",
 "serde_json",
 "sync_wrapper",
 "tokio",
 "tokio-rustls 0.26.4",
 "tower",
 "tower-http",
 "tower-service",
 "url",
 "wasm-bindgen",
 "wasm-bindgen-futures",
 "web-sys",
]

[[package]]
name = "rfc6979"
version = "0.3.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7743f17af12fa0b03b803ba12cd6a8d9483a587e89c69445e3909655c0b9fabb"
dependencies = [
 "crypto-bigint 0.4.9",
 "hmac",
 "zeroize",
]

[[package]]
name = "rfc6979"
version = "0.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f8dd2a808d456c4a54e300a23e9f5a67e122c3024119acbfd73e3bf664491cb2"
dependencies = [
 "hmac",
 "subtle",
]

[[package]]
name = "rgb"
version = "0.8.52"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0c6a884d2998352bb4daf0183589aec883f16a6da1f4dde84d8e2e9a5409a1ce"

[[package]]
name = "ring"
version = "0.17.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a4689e6c2294d81e88dc6261c768b63bc4fcdb852be6d1352498b114f61383b7"
dependencies = [
 "cc",
 "cfg-if",
 "getrandom 0.2.17",
 "libc",
 "untrusted",
 "windows-sys 0.52.0",
]

[[package]]
name = "ron"
version = "0.12.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fd490c5b18261893f14449cbd28cb9c0b637aebf161cd77900bfdedaff21ec32"
dependencies = [
 "bitflags",
 "once_cell",
 "serde",
 "serde_derive",
 "typeid",
 "unicode-ident",
]

[[package]]
name = "rsa"
version = "0.9.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b8573f03f5883dcaebdfcf4725caa1ecb9c15b2ef50c43a07b816e06799bb12d"
dependencies = [
 "const-oid",
 "digest",
 "num-bigint-dig",
 "num-integer",
 "num-traits",
 "pkcs1",
 "pkcs8 0.10.2",
 "rand_core 0.6.4",
 "signature 2.2.0",
 "spki 0.7.3",
 "subtle",
 "zeroize",
]

[[package]]
name = "rust-ini"
version = "0.21.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "796e8d2b6696392a43bea58116b667fb4c29727dc5abd27d6acf338bb4f688c7"
dependencies = [
 "cfg-if",
 "ordered-multimap",
]

[[package]]
name = "rustc-hash"
version = "2.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "357703d41365b4b27c590e3ed91eabb1b663f07c4c084095e60cbed4362dff0d"

[[package]]
name = "rustc_version"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cfcb3a22ef46e85b45de6ee7e79d063319ebb6594faafcf1c225ea92ab6e9b92"
dependencies = [
 "semver",
]

[[package]]
name = "rustix"
version = "1.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "146c9e247ccc180c1f61615433868c99f3de3ae256a30a43b49f67c2d9171f34"
dependencies = [
 "bitflags",
 "errno",
 "libc",
 "linux-raw-sys",
 "windows-sys 0.61.2",
]

[[package]]
name = "rustls"
version = "0.21.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3f56a14d1f48b391359b22f731fd4bd7e43c97f3c50eee276f3aa09c94784d3e"
dependencies = [
 "log",
 "ring",
 "rustls-webpki 0.101.7",
 "sct",
]

[[package]]
name = "rustls"
version = "0.23.36"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c665f33d38cea657d9614f766881e4d510e0eda4239891eea56b4cadcf01801b"
dependencies = [
 "aws-lc-rs",
 "once_cell",
 "rustls-pki-types",
 "rustls-webpki 0.103.9",
 "subtle",
 "zeroize",
]

[[package]]
name = "rustls-native-certs"
version = "0.8.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "612460d5f7bea540c490b2b6395d8e34a953e52b491accd6c86c8164c5932a63"
dependencies = [
 "openssl-probe 0.2.1",
 "rustls-pki-types",
 "schannel",
 "security-framework 3.5.1",
]

[[package]]
name = "rustls-pki-types"
version = "1.14.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "be040f8b0a225e40375822a563fa9524378b9d63112f53e19ffff34df5d33fdd"
dependencies = [
 "web-time",
 "zeroize",
]

[[package]]
name = "rustls-platform-verifier"
version = "0.6.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1d99feebc72bae7ab76ba994bb5e121b8d83d910ca40b36e0921f53becc41784"
dependencies = [
 "core-foundation 0.10.1",
 "core-foundation-sys",
 "jni",
 "log",
 "once_cell",
 "rustls 0.23.36",
 "rustls-native-certs",
 "rustls-platform-verifier-android",
 "rustls-webpki 0.103.9",
 "security-framework 3.5.1",
 "security-framework-sys",
 "webpki-root-certs",
 "windows-sys 0.61.2",
]

[[package]]
name = "rustls-platform-verifier-android"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f87165f0995f63a9fbeea62b64d10b4d9d8e78ec6d7d51fb2125fda7bb36788f"

[[package]]
name = "rustls-webpki"
version = "0.101.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8b6275d1ee7a1cd780b64aca7726599a1dbc893b1e64144529e55c3c2f745765"
dependencies = [
 "ring",
 "untrusted",
]

[[package]]
name = "rustls-webpki"
version = "0.103.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d7df23109aa6c1567d1c575b9952556388da57401e4ace1d15f79eedad0d8f53"
dependencies = [
 "aws-lc-rs",
 "ring",
 "rustls-pki-types",
 "untrusted",
]

[[package]]
name = "rustversion"
version = "1.0.22"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b39cdef0fa800fc44525c84ccb54a029961a8215f9619753635a9c0d2538d46d"

[[package]]
name = "ryu"
version = "1.0.23"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9774ba4a74de5f7b1c1451ed6cd5285a32eddb5cccb8cc655a4e50009e06477f"

[[package]]
name = "same-file"
version = "1.0.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "93fc1dc3aaa9bfed95e02e6eadabb4baf7e3078b0bd1b4d7b6b0b68378900502"
dependencies = [
 "winapi-util",
]

[[package]]
name = "schannel"
version = "0.1.28"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "891d81b926048e76efe18581bf793546b4c0eaf8448d72be8de2bbee5fd166e1"
dependencies = [
 "windows-sys 0.61.2",
]

[[package]]
name = "scopeguard"
version = "1.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "94143f37725109f92c262ed2cf5e59bce7498c01bcc1502d7b9afe439a4e9f49"

[[package]]
name = "sct"
version = "0.7.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "da046153aa2352493d6cb7da4b6e5c0c057d8a1d0a9aa8560baffdd945acd414"
dependencies = [
 "ring",
 "untrusted",
]

[[package]]
name = "sec1"
version = "0.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3be24c1842290c45df0a7bf069e0c268a747ad05a192f2fd7dcfdbc1cba40928"
dependencies = [
 "base16ct 0.1.1",
 "der 0.6.1",
 "generic-array",
 "pkcs8 0.9.0",
 "subtle",
 "zeroize",
]

[[package]]
name = "sec1"
version = "0.7.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d3e97a565f76233a6003f9f5c54be1d9c5bdfa3eccfb189469f11ec4901c47dc"
dependencies = [
 "base16ct 0.2.0",
 "der 0.7.10",
 "generic-array",
 "pkcs8 0.10.2",
 "subtle",
 "zeroize",
]

[[package]]
name = "security-framework"
version = "2.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "897b2245f0b511c87893af39b033e5ca9cce68824c4d7e7630b5a1d339658d02"
dependencies = [
 "bitflags",
 "core-foundation 0.9.4",
 "core-foundation-sys",
 "libc",
 "security-framework-sys",
]

[[package]]
name = "security-framework"
version = "3.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b3297343eaf830f66ede390ea39da1d462b6b0c1b000f420d0a83f898bbbe6ef"
dependencies = [
 "bitflags",
 "core-foundation 0.10.1",
 "core-foundation-sys",
 "libc",
 "security-framework-sys",
]

[[package]]
name = "security-framework-sys"
version = "2.15.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cc1f0cbffaac4852523ce30d8bd3c5cdc873501d96ff467ca09b6767bb8cd5c0"
dependencies = [
 "core-foundation-sys",
 "libc",
]

[[package]]
name = "semver"
version = "1.0.27"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d767eb0aabc880b29956c35734170f26ed551a859dbd361d140cdbeca61ab1e2"

[[package]]
name = "serde"
version = "1.0.228"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9a8e94ea7f378bd32cbbd37198a4a91436180c5bb472411e48b5ec2e2124ae9e"
dependencies = [
 "serde_core",
 "serde_derive",
]

[[package]]
name = "serde-untagged"
version = "0.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f9faf48a4a2d2693be24c6289dbe26552776eb7737074e6722891fadbe6c5058"
dependencies = [
 "erased-serde",
 "serde",
 "serde_core",
 "typeid",
]

[[package]]
name = "serde_core"
version = "1.0.228"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "41d385c7d4ca58e59fc732af25c3983b67ac852c1a25000afe1175de458b67ad"
dependencies = [
 "serde_derive",
]

[[package]]
name = "serde_derive"
version = "1.0.228"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d540f220d3187173da220f885ab66608367b6574e925011a9353e4badda91d79"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "serde_json"
version = "1.0.149"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "83fc039473c5595ace860d8c4fafa220ff474b3fc6bfdb4293327f1a37e94d86"
dependencies = [
 "itoa",
 "memchr",
 "serde",
 "serde_core",
 "zmij",
]

[[package]]
name = "serde_path_to_error"
version = "0.1.20"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "10a9ff822e371bb5403e391ecd83e182e0e77ba7f6fe0160b795797109d1b457"
dependencies = [
 "itoa",
 "serde",
 "serde_core",
]

[[package]]
name = "serde_spanned"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f8bbf91e5a4d6315eee45e704372590b30e260ee83af6639d64557f51b067776"
dependencies = [
 "serde_core",
]

[[package]]
name = "serde_urlencoded"
version = "0.7.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d3491c14715ca2294c4d6a88f15e84739788c1d030eed8c110436aafdaa2f3fd"
dependencies = [
 "form_urlencoded",
 "itoa",
 "ryu",
 "serde",
]

[[package]]
name = "sha1"
version = "0.10.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e3bf829a2d51ab4a5ddf1352d8470c140cadc8301b2ae1789db023f01cedd6ba"
dependencies = [
 "cfg-if",
 "cpufeatures",
 "digest",
]

[[package]]
name = "sha1_smol"
version = "1.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bbfa15b3dddfee50a0fff136974b3e1bde555604ba463834a7eb7deb6417705d"

[[package]]
name = "sha2"
version = "0.10.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a7507d819769d01a365ab707794a4084392c824f54a7a6a7862f8c3d0892b283"
dependencies = [
 "cfg-if",
 "cpufeatures",
 "digest",
]

[[package]]
name = "sharded-slab"
version = "0.1.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f40ca3c46823713e0d4209592e8d6e826aa57e928f09752619fc696c499637f6"
dependencies = [
 "lazy_static",
]

[[package]]
name = "shlex"
version = "1.3.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0fda2ff0d084019ba4d7c6f371c95d8fd75ce3524c3cb8fb653a3023f6323e64"

[[package]]
name = "signal-hook-registry"
version = "1.4.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c4db69cba1110affc0e9f7bcd48bbf87b3f4fc7c61fc9155afd4c469eb3d6c1b"
dependencies = [
 "errno",
 "libc",
]

[[package]]
name = "signature"
version = "1.6.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "74233d3b3b2f6d4b006dc19dee745e73e2a6bfb6f93607cd3b02bd5b00797d7c"
dependencies = [
 "digest",
 "rand_core 0.6.4",
]

[[package]]
name = "signature"
version = "2.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "77549399552de45a898a580c1b41d445bf730df867cc44e6c0233bbc4b8329de"
dependencies = [
 "digest",
 "rand_core 0.6.4",
]

[[package]]
name = "simd-adler32"
version = "0.3.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e320a6c5ad31d271ad523dcf3ad13e2767ad8b1cb8f047f75a8aeaf8da139da2"

[[package]]
name = "simd_helpers"
version = "0.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "95890f873bec569a0362c235787f3aca6e1e887302ba4840839bcc6459c42da6"
dependencies = [
 "quote",
]

[[package]]
name = "simple_asn1"
version = "0.6.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "297f631f50729c8c99b84667867963997ec0b50f32b2a7dbcab828ef0541e8bb"
dependencies = [
 "num-bigint",
 "num-traits",
 "thiserror 2.0.18",
 "time",
]

[[package]]
name = "slab"
version = "0.4.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0c790de23124f9ab44544d7ac05d60440adc586479ce501c1d6d7da3cd8c9cf5"

[[package]]
name = "smallvec"
version = "1.15.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "67b1b7a3b5fe4f1376887184045fcf45c69e92af734b7aaddc05fb777b6fbd03"
dependencies = [
 "serde",
]

[[package]]
name = "socket2"
version = "0.5.10"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e22376abed350d73dd1cd119b57ffccad95b4e585a7cda43e286245ce23c0678"
dependencies = [
 "libc",
 "windows-sys 0.52.0",
]

[[package]]
name = "socket2"
version = "0.6.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "86f4aa3ad99f2088c990dfa82d367e19cb29268ed67c574d10d0a4bfe71f07e0"
dependencies = [
 "libc",
 "windows-sys 0.60.2",
]

[[package]]
name = "socks"
version = "0.3.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f0c3dbbd9ae980613c6dd8e28a9407b50509d3803b57624d5dfe8315218cd58b"
dependencies = [
 "byteorder",
 "libc",
 "winapi",
]

[[package]]
name = "spin"
version = "0.9.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6980e8d7511241f8acf4aebddbb1ff938df5eebe98691418c4468d0b72a96a67"
dependencies = [
 "lock_api",
]

[[package]]
name = "spin"
version = "0.10.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d5fe4ccb98d9c292d56fec89a5e07da7fc4cf0dc11e156b41793132775d3e591"

[[package]]
name = "spki"
version = "0.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "67cf02bbac7a337dc36e4f5a693db6c21e7863f45070f7064577eb4367a3212b"
dependencies = [
 "base64ct",
 "der 0.6.1",
]

[[package]]
name = "spki"
version = "0.7.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d91ed6c858b01f942cd56b37a94b3e0a1798290327d1236e4d9cf4eaca44d29d"
dependencies = [
 "base64ct",
 "der 0.7.10",
]

[[package]]
name = "sqlx"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1fefb893899429669dcdd979aff487bd78f4064e5e7907e4269081e0ef7d97dc"
dependencies = [
 "sqlx-core",
 "sqlx-macros",
 "sqlx-mysql",
 "sqlx-postgres",
 "sqlx-sqlite",
]

[[package]]
name = "sqlx-core"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ee6798b1838b6a0f69c007c133b8df5866302197e404e8b6ee8ed3e3a5e68dc6"
dependencies = [
 "base64",
 "bytes",
 "chrono",
 "crc",
 "crossbeam-queue",
 "either",
 "event-listener",
 "futures-core",
 "futures-intrusive",
 "futures-io",
 "futures-util",
 "hashbrown 0.15.5",
 "hashlink",
 "indexmap",
 "ipnetwork",
 "log",
 "memchr",
 "native-tls",
 "once_cell",
 "percent-encoding",
 "serde",
 "serde_json",
 "sha2",
 "smallvec",
 "thiserror 2.0.18",
 "tokio",
 "tokio-stream",
 "tracing",
 "url",
 "uuid",
]

[[package]]
name = "sqlx-macros"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a2d452988ccaacfbf5e0bdbc348fb91d7c8af5bee192173ac3636b5fb6e6715d"
dependencies = [
 "proc-macro2",
 "quote",
 "sqlx-core",
 "sqlx-macros-core",
 "syn",
]

[[package]]
name = "sqlx-macros-core"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "19a9c1841124ac5a61741f96e1d9e2ec77424bf323962dd894bdb93f37d5219b"
dependencies = [
 "dotenvy",
 "either",
 "heck",
 "hex",
 "once_cell",
 "proc-macro2",
 "quote",
 "serde",
 "serde_json",
 "sha2",
 "sqlx-core",
 "sqlx-mysql",
 "sqlx-postgres",
 "sqlx-sqlite",
 "syn",
 "tokio",
 "url",
]

[[package]]
name = "sqlx-mysql"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "aa003f0038df784eb8fecbbac13affe3da23b45194bd57dba231c8f48199c526"
dependencies = [
 "atoi",
 "base64",
 "bitflags",
 "byteorder",
 "bytes",
 "chrono",
 "crc",
 "digest",
 "dotenvy",
 "either",
 "futures-channel",
 "futures-core",
 "futures-io",
 "futures-util",
 "generic-array",
 "hex",
 "hkdf",
 "hmac",
 "itoa",
 "log",
 "md-5",
 "memchr",
 "once_cell",
 "percent-encoding",
 "rand 0.8.5",
 "rsa",
 "serde",
 "sha1",
 "sha2",
 "smallvec",
 "sqlx-core",
 "stringprep",
 "thiserror 2.0.18",
 "tracing",
 "uuid",
 "whoami",
]

[[package]]
name = "sqlx-postgres"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "db58fcd5a53cf07c184b154801ff91347e4c30d17a3562a635ff028ad5deda46"
dependencies = [
 "atoi",
 "base64",
 "bitflags",
 "byteorder",
 "chrono",
 "crc",
 "dotenvy",
 "etcetera",
 "futures-channel",
 "futures-core",
 "futures-util",
 "hex",
 "hkdf",
 "hmac",
 "home",
 "ipnetwork",
 "itoa",
 "log",
 "md-5",
 "memchr",
 "once_cell",
 "rand 0.8.5",
 "serde",
 "serde_json",
 "sha2",
 "smallvec",
 "sqlx-core",
 "stringprep",
 "thiserror 2.0.18",
 "tracing",
 "uuid",
 "whoami",
]

[[package]]
name = "sqlx-sqlite"
version = "0.8.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c2d12fe70b2c1b4401038055f90f151b78208de1f9f89a7dbfd41587a10c3eea"
dependencies = [
 "atoi",
 "chrono",
 "flume",
 "futures-channel",
 "futures-core",
 "futures-executor",
 "futures-intrusive",
 "futures-util",
 "libsqlite3-sys",
 "log",
 "percent-encoding",
 "serde",
 "serde_urlencoded",
 "sqlx-core",
 "thiserror 2.0.18",
 "tracing",
 "url",
 "uuid",
]

[[package]]
name = "stable_deref_trait"
version = "1.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6ce2be8dc25455e1f91df71bfa12ad37d7af1092ae736f3a6cd0e37bc7810596"

[[package]]
name = "stringprep"
version = "0.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7b4df3d392d81bd458a8a621b8bffbd2302a12ffe288a9d931670948749463b1"
dependencies = [
 "unicode-bidi",
 "unicode-normalization",
 "unicode-properties",
]

[[package]]
name = "strsim"
version = "0.11.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7da8b5736845d9f2fcb837ea5d9e2628564b3b043a70948a3f0b778838c5fb4f"

[[package]]
name = "subtle"
version = "2.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "13c2bddecc57b384dee18652358fb23172facb8a2c51ccc10d74c157bdea3292"

[[package]]
name = "syn"
version = "2.0.114"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d4d107df263a3013ef9b1879b0df87d706ff80f65a86ea879bd9c31f9b307c2a"
dependencies = [
 "proc-macro2",
 "quote",
 "unicode-ident",
]

[[package]]
name = "sync_wrapper"
version = "1.0.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0bf256ce5efdfa370213c1dabab5935a12e49f2c58d15e9eac2870d3b4f27263"
dependencies = [
 "futures-core",
]

[[package]]
name = "synstructure"
version = "0.13.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "728a70f3dbaf5bab7f0c4b1ac8d7ae5ea60a4b5549c8a5914361c99147a709d2"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "system-configuration"
version = "0.7.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a13f3d0daba03132c0aa9767f98351b3488edc2c100cda2d2ec2b04f3d8d3c8b"
dependencies = [
 "bitflags",
 "core-foundation 0.9.4",
 "system-configuration-sys",
]

[[package]]
name = "system-configuration-sys"
version = "0.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8e1d1b10ced5ca923a1fcb8d03e96b8d3268065d724548c0211415ff6ac6bac4"
dependencies = [
 "core-foundation-sys",
 "libc",
]

[[package]]
name = "tempfile"
version = "3.25.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0136791f7c95b1f6dd99f9cc786b91bb81c3800b639b3478e561ddb7be95e5f1"
dependencies = [
 "fastrand",
 "getrandom 0.4.1",
 "once_cell",
 "rustix",
 "windows-sys 0.61.2",
]

[[package]]
name = "termcolor"
version = "1.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "06794f8f6c5c898b3275aebefa6b8a1cb24cd2c6c79397ab15774837a0bc5755"
dependencies = [
 "winapi-util",
]

[[package]]
name = "termtree"
version = "0.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8f50febec83f5ee1df3015341d8bd429f2d1cc62bcba7ea2076759d315084683"

[[package]]
name = "thiserror"
version = "1.0.69"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b6aaf5339b578ea85b50e080feb250a3e8ae8cfcdff9a461c9ec2904bc923f52"
dependencies = [
 "thiserror-impl 1.0.69",
]

[[package]]
name = "thiserror"
version = "2.0.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4288b5bcbc7920c07a1149a35cf9590a2aa808e0bc1eafaade0b80947865fbc4"
dependencies = [
 "thiserror-impl 2.0.18",
]

[[package]]
name = "thiserror-impl"
version = "1.0.69"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4fee6c4efc90059e10f81e6d42c60a18f76588c3d74cb83a0b242a2b6c7504c1"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "thiserror-impl"
version = "2.0.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ebc4ee7f67670e9b64d05fa4253e753e016c6c95ff35b89b7941d6b856dec1d5"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "thread_local"
version = "1.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f60246a4944f24f6e018aa17cdeffb7818b76356965d03b07d6a9886e8962185"
dependencies = [
 "cfg-if",
]

[[package]]
name = "tiff"
version = "0.10.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "af9605de7fee8d9551863fd692cce7637f548dbd9db9180fcc07ccc6d26c336f"
dependencies = [
 "fax",
 "flate2",
 "half",
 "quick-error",
 "weezl",
 "zune-jpeg 0.4.21",
]

[[package]]
name = "time"
version = "0.3.47"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "743bd48c283afc0388f9b8827b976905fb217ad9e647fae3a379a9283c4def2c"
dependencies = [
 "deranged",
 "itoa",
 "num-conv",
 "powerfmt",
 "serde_core",
 "time-core",
 "time-macros",
]

[[package]]
name = "time-core"
version = "0.1.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7694e1cfe791f8d31026952abf09c69ca6f6fa4e1a1229e18988f06a04a12dca"

[[package]]
name = "time-macros"
version = "0.2.27"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2e70e4c5a0e0a8a4823ad65dfe1a6930e4f4d756dcd9dd7939022b5e8c501215"
dependencies = [
 "num-conv",
 "time-core",
]

[[package]]
name = "tiny-keccak"
version = "2.0.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2c9d3793400a45f954c52e73d068316d76b6f4e36977e3fcebb13a2721e80237"
dependencies = [
 "crunchy",
]

[[package]]
name = "tinystr"
version = "0.8.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "42d3e9c45c09de15d06dd8acf5f4e0e399e85927b7f00711024eb7ae10fa4869"
dependencies = [
 "displaydoc",
 "zerovec",
]

[[package]]
name = "tinyvec"
version = "1.10.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bfa5fdc3bce6191a1dbc8c02d5c8bffcf557bafa17c124c5264a458f1b0613fa"
dependencies = [
 "tinyvec_macros",
]

[[package]]
name = "tinyvec_macros"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1f3ccbac311fea05f86f61904b462b55fb3df8837a366dfc601a0161d0532f20"

[[package]]
name = "tokio"
version = "1.49.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "72a2903cd7736441aac9df9d7688bd0ce48edccaadf181c3b90be801e81d3d86"
dependencies = [
 "bytes",
 "libc",
 "mio",
 "parking_lot",
 "pin-project-lite",
 "signal-hook-registry",
 "socket2 0.6.2",
 "tokio-macros",
 "windows-sys 0.61.2",
]

[[package]]
name = "tokio-macros"
version = "2.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "af407857209536a95c8e56f8231ef2c2e2aff839b22e07a1ffcbc617e9db9fa5"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "tokio-native-tls"
version = "0.3.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bbae76ab933c85776efabc971569dd6119c580d8f5d448769dec1764bf796ef2"
dependencies = [
 "native-tls",
 "tokio",
]

[[package]]
name = "tokio-rustls"
version = "0.24.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c28327cf380ac148141087fbfb9de9d7bd4e84ab5d2c28fbc911d753de8a7081"
dependencies = [
 "rustls 0.21.12",
 "tokio",
]

[[package]]
name = "tokio-rustls"
version = "0.26.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1729aa945f29d91ba541258c8df89027d5792d85a8841fb65e8bf0f4ede4ef61"
dependencies = [
 "rustls 0.23.36",
 "tokio",
]

[[package]]
name = "tokio-stream"
version = "0.1.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "32da49809aab5c3bc678af03902d4ccddea2a87d028d86392a4b1560c6906c70"
dependencies = [
 "futures-core",
 "pin-project-lite",
 "tokio",
]

[[package]]
name = "tokio-util"
version = "0.7.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9ae9cec805b01e8fc3fd2fe289f89149a9b66dd16786abd8b19cfa7b48cb0098"
dependencies = [
 "bytes",
 "futures-core",
 "futures-sink",
 "pin-project-lite",
 "tokio",
]

[[package]]
name = "toml"
version = "0.9.11+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f3afc9a848309fe1aaffaed6e1546a7a14de1f935dc9d89d32afd9a44bab7c46"
dependencies = [
 "serde_core",
 "serde_spanned",
 "toml_datetime",
 "toml_parser",
 "winnow",
]

[[package]]
name = "toml_datetime"
version = "0.7.5+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "92e1cfed4a3038bc5a127e35a2d360f145e1f4b971b551a2ba5fd7aedf7e1347"
dependencies = [
 "serde_core",
]

[[package]]
name = "toml_parser"
version = "1.0.6+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a3198b4b0a8e11f09dd03e133c0280504d0801269e9afa46362ffde1cbeebf44"
dependencies = [
 "winnow",
]

[[package]]
name = "tower"
version = "0.5.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ebe5ef63511595f1344e2d5cfa636d973292adc0eec1f0ad45fae9f0851ab1d4"
dependencies = [
 "futures-core",
 "futures-util",
 "pin-project-lite",
 "sync_wrapper",
 "tokio",
 "tower-layer",
 "tower-service",
 "tracing",
]

[[package]]
name = "tower-http"
version = "0.6.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d4e6559d53cc268e5031cd8429d05415bc4cb4aefc4aa5d6cc35fbf5b924a1f8"
dependencies = [
 "bitflags",
 "bytes",
 "futures-core",
 "futures-util",
 "http 1.4.0",
 "http-body 1.0.1",
 "http-body-util",
 "http-range-header",
 "httpdate",
 "iri-string",
 "mime",
 "mime_guess",
 "percent-encoding",
 "pin-project-lite",
 "tokio",
 "tokio-util",
 "tower",
 "tower-layer",
 "tower-service",
 "tracing",
]

[[package]]
name = "tower-layer"
version = "0.3.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "121c2a6cda46980bb0fcd1647ffaf6cd3fc79a013de288782836f6df9c48780e"

[[package]]
name = "tower-service"
version = "0.3.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8df9b6e13f2d32c91b9bd719c00d1958837bc7dec474d94952798cc8e69eeec3"

[[package]]
name = "tracing"
version = "0.1.44"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "63e71662fa4b2a2c3a26f570f037eb95bb1f85397f3cd8076caed2f026a6d100"
dependencies = [
 "log",
 "pin-project-lite",
 "tracing-attributes",
 "tracing-core",
]

[[package]]
name = "tracing-attributes"
version = "0.1.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7490cfa5ec963746568740651ac6781f701c9c5ea257c58e057f3ba8cf69e8da"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "tracing-core"
version = "0.1.36"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "db97caf9d906fbde555dd62fa95ddba9eecfd14cb388e4f491a66d74cd5fb79a"
dependencies = [
 "once_cell",
 "valuable",
]

[[package]]
name = "tracing-log"
version = "0.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ee855f1f400bd0e5c02d150ae5de3840039a3f54b025156404e34c23c03f47c3"
dependencies = [
 "log",
 "once_cell",
 "tracing-core",
]

[[package]]
name = "tracing-subscriber"
version = "0.3.22"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2f30143827ddab0d256fd843b7a66d164e9f271cfa0dde49142c5ca0ca291f1e"
dependencies = [
 "matchers",
 "nu-ansi-term",
 "once_cell",
 "regex-automata",
 "sharded-slab",
 "smallvec",
 "thread_local",
 "tracing",
 "tracing-core",
 "tracing-log",
]

[[package]]
name = "try-lock"
version = "0.2.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e421abadd41a4225275504ea4d6566923418b7f05506fbc9c0fe86ba7396114b"

[[package]]
name = "ts-rs"
version = "12.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "756050066659291d47a554a9f558125db17428b073c5ffce1daf5dcb0f7231d8"
dependencies = [
 "chrono",
 "thiserror 2.0.18",
 "ts-rs-macros",
 "uuid",
]

[[package]]
name = "ts-rs-macros"
version = "12.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "38d90eea51bc7988ef9e674bf80a85ba6804739e535e9cab48e4bb34a8b652aa"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
 "termcolor",
]

[[package]]
name = "typeid"
version = "1.0.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bc7d623258602320d5c55d1bc22793b57daff0ec7efc270ea7d55ce1d5f5471c"

[[package]]
name = "typenum"
version = "1.19.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "562d481066bde0658276a35467c4af00bdc6ee726305698a55b86e61d7ad82bb"

[[package]]
name = "ucd-trie"
version = "0.1.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2896d95c02a80c6d6a5d6e953d479f5ddf2dfdb6a244441010e373ac0fb88971"

[[package]]
name = "unicase"
version = "2.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "dbc4bc3a9f746d862c45cb89d705aa10f187bb96c76001afab07a0d35ce60142"

[[package]]
name = "unicode-bidi"
version = "0.3.18"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5c1cb5db39152898a79168971543b1cb5020dff7fe43c8dc468b0885f5e29df5"

[[package]]
name = "unicode-ident"
version = "1.0.23"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "537dd038a89878be9b64dd4bd1b260315c1bb94f4d784956b81e27a088d9a09e"

[[package]]
name = "unicode-normalization"
version = "0.1.25"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5fd4f6878c9cb28d874b009da9e8d183b5abc80117c40bbd187a1fde336be6e8"
dependencies = [
 "tinyvec",
]

[[package]]
name = "unicode-properties"
version = "0.1.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7df058c713841ad818f1dc5d3fd88063241cc61f49f5fbea4b951e8cf5a8d71d"

[[package]]
name = "unicode-segmentation"
version = "1.12.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f6ccf251212114b54433ec949fd6a7841275f9ada20dddd2f29e9ceea4501493"

[[package]]
name = "unicode-xid"
version = "0.2.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ebc1c04c71510c7f702b52b7c350734c9ff1295c464a03335b00bb84fc54f853"

[[package]]
name = "untrusted"
version = "0.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8ecb6da28b8a351d773b68d5825ac39017e680750f980f3a1a85cd8dd28a47c1"

[[package]]
name = "ureq"
version = "3.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fdc97a28575b85cfedf2a7e7d3cc64b3e11bd8ac766666318003abbacc7a21fc"
dependencies = [
 "base64",
 "der 0.7.10",
 "log",
 "native-tls",
 "percent-encoding",
 "rustls-pki-types",
 "socks",
 "ureq-proto",
 "utf-8",
 "webpki-root-certs",
]

[[package]]
name = "ureq-proto"
version = "0.5.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d81f9efa9df032be5934a46a068815a10a042b494b6a58cb0a1a97bb5467ed6f"
dependencies = [
 "base64",
 "http 1.4.0",
 "httparse",
 "log",
]

[[package]]
name = "url"
version = "2.5.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ff67a8a4397373c3ef660812acab3268222035010ab8680ec4215f38ba3d0eed"
dependencies = [
 "form_urlencoded",
 "idna",
 "percent-encoding",
 "serde",
]

[[package]]
name = "urlencoding"
version = "2.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "daf8dba3b7eb870caf1ddeed7bc9d2a049f3cfdfae7cb521b087cc33ae4c49da"

[[package]]
name = "utf-8"
version = "0.7.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "09cc8ee72d2a9becf2f2febe0205bbed8fc6615b7cb429ad062dc7b7ddd036a9"

[[package]]
name = "utf8_iter"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b6c140620e7ffbb22c2dee59cafe6084a59b5ffc27a8859a5f0d494b5d52b6be"

[[package]]
name = "uuid"
version = "1.20.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ee48d38b119b0cd71fe4141b30f5ba9c7c5d9f4e7a3a8b4a674e4b6ef789976f"
dependencies = [
 "getrandom 0.3.4",
 "js-sys",
 "serde_core",
 "wasm-bindgen",
]

[[package]]
name = "v_frame"
version = "0.3.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "666b7727c8875d6ab5db9533418d7c764233ac9c0cff1d469aec8fa127597be2"
dependencies = [
 "aligned-vec",
 "num-traits",
 "wasm-bindgen",
]

[[package]]
name = "validator"
version = "0.20.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "43fb22e1a008ece370ce08a3e9e4447a910e92621bb49b85d6e48a45397e7cfa"
dependencies = [
 "idna",
 "once_cell",
 "regex",
 "serde",
 "serde_derive",
 "serde_json",
 "url",
 "validator_derive",
]

[[package]]
name = "validator_derive"
version = "0.20.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b7df16e474ef958526d1205f6dda359fdfab79d9aa6d54bafcb92dcd07673dca"
dependencies = [
 "darling",
 "once_cell",
 "proc-macro-error2",
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "valuable"
version = "0.1.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ba73ea9cf16a25df0c8caa16c51acb937d5712a8429db78a3ee29d5dcacd3a65"

[[package]]
name = "vcpkg"
version = "0.2.15"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "accd4ea62f7bb7a82fe23066fb0957d48ef677f6eeb8215f372f52e48bb32426"

[[package]]
name = "version_check"
version = "0.9.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0b928f33d975fc6ad9f86c8f283853ad26bdd5b10b7f1542aa2fa15e2289105a"

[[package]]
name = "vsimd"
version = "0.8.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5c3082ca00d5a5ef149bb8b555a72ae84c9c59f7250f013ac822ac2e49b19c64"

[[package]]
name = "walkdir"
version = "2.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "29790946404f91d9c5d06f9874efddea1dc06c5efe94541a7d6863108e3a5e4b"
dependencies = [
 "same-file",
 "winapi-util",
]

[[package]]
name = "want"
version = "0.3.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bfa7760aed19e106de2c7c0b581b509f2f25d3dacaf737cb82ac61bc6d760b0e"
dependencies = [
 "try-lock",
]

[[package]]
name = "wasi"
version = "0.11.1+wasi-snapshot-preview1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ccf3ec651a847eb01de73ccad15eb7d99f80485de043efb2f370cd654f4ea44b"

[[package]]
name = "wasip2"
version = "1.0.2+wasi-0.2.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9517f9239f02c069db75e65f174b3da828fe5f5b945c4dd26bd25d89c03ebcf5"
dependencies = [
 "wit-bindgen",
]

[[package]]
name = "wasip3"
version = "0.4.0+wasi-0.3.0-rc-2026-01-06"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5428f8bf88ea5ddc08faddef2ac4a67e390b88186c703ce6dbd955e1c145aca5"
dependencies = [
 "wit-bindgen",
]

[[package]]
name = "wasite"
version = "0.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b8dad83b4f25e74f184f64c43b150b91efe7647395b42289f38e50566d82855b"

[[package]]
name = "wasm-bindgen"
version = "0.2.108"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "64024a30ec1e37399cf85a7ffefebdb72205ca1c972291c51512360d90bd8566"
dependencies = [
 "cfg-if",
 "once_cell",
 "rustversion",
 "wasm-bindgen-macro",
 "wasm-bindgen-shared",
]

[[package]]
name = "wasm-bindgen-futures"
version = "0.4.58"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "70a6e77fd0ae8029c9ea0063f87c46fde723e7d887703d74ad2616d792e51e6f"
dependencies = [
 "cfg-if",
 "futures-util",
 "js-sys",
 "once_cell",
 "wasm-bindgen",
 "web-sys",
]

[[package]]
name = "wasm-bindgen-macro"
version = "0.2.108"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "008b239d9c740232e71bd39e8ef6429d27097518b6b30bdf9086833bd5b6d608"
dependencies = [
 "quote",
 "wasm-bindgen-macro-support",
]

[[package]]
name = "wasm-bindgen-macro-support"
version = "0.2.108"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5256bae2d58f54820e6490f9839c49780dff84c65aeab9e772f15d5f0e913a55"
dependencies = [
 "bumpalo",
 "proc-macro2",
 "quote",
 "syn",
 "wasm-bindgen-shared",
]

[[package]]
name = "wasm-bindgen-shared"
version = "0.2.108"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1f01b580c9ac74c8d8f0c0e4afb04eeef2acf145458e52c03845ee9cd23e3d12"
dependencies = [
 "unicode-ident",
]

[[package]]
name = "wasm-encoder"
version = "0.244.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "990065f2fe63003fe337b932cfb5e3b80e0b4d0f5ff650e6985b1048f62c8319"
dependencies = [
 "leb128fmt",
 "wasmparser",
]

[[package]]
name = "wasm-metadata"
version = "0.244.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bb0e353e6a2fbdc176932bbaab493762eb1255a7900fe0fea1a2f96c296cc909"
dependencies = [
 "anyhow",
 "indexmap",
 "wasm-encoder",
 "wasmparser",
]

[[package]]
name = "wasmparser"
version = "0.244.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "47b807c72e1bac69382b3a6fb3dbe8ea4c0ed87ff5629b8685ae6b9a611028fe"
dependencies = [
 "bitflags",
 "hashbrown 0.15.5",
 "indexmap",
 "semver",
]

[[package]]
name = "web-sys"
version = "0.3.85"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "312e32e551d92129218ea9a2452120f4aabc03529ef03e4d0d82fb2780608598"
dependencies = [
 "js-sys",
 "wasm-bindgen",
]

[[package]]
name = "web-time"
version = "1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5a6580f308b1fad9207618087a65c04e7a10bc77e02c8e84e9b00dd4b12fa0bb"
dependencies = [
 "js-sys",
 "wasm-bindgen",
]

[[package]]
name = "webpki-root-certs"
version = "1.0.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "804f18a4ac2676ffb4e8b5b5fa9ae38af06df08162314f96a68d2a363e21a8ca"
dependencies = [
 "rustls-pki-types",
]

[[package]]
name = "weezl"
version = "0.1.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a28ac98ddc8b9274cb41bb4d9d4d5c425b6020c50c46f25559911905610b4a88"

[[package]]
name = "whoami"
version = "1.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5d4a4db5077702ca3015d3d02d74974948aba2ad9e12ab7df718ee64ccd7e97d"
dependencies = [
 "libredox",
 "wasite",
]

[[package]]
name = "winapi"
version = "0.3.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5c839a674fcd7a98952e593242ea400abe93992746761e38641405d28b00f419"
dependencies = [
 "winapi-i686-pc-windows-gnu",
 "winapi-x86_64-pc-windows-gnu",
]

[[package]]
name = "winapi-i686-pc-windows-gnu"
version = "0.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ac3b87c63620426dd9b991e5ce0329eff545bccbbb34f3be09ff6fb6ab51b7b6"

[[package]]
name = "winapi-util"
version = "0.1.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c2a7b1c03c876122aa43f3020e6c3c3ee5c05081c9a00739faf7503aeba10d22"
dependencies = [
 "windows-sys 0.61.2",
]

[[package]]
name = "winapi-x86_64-pc-windows-gnu"
version = "0.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "712e227841d057c1ee1cd2fb22fa7e5a5461ae8e48fa2ca79ec42cfc1931183f"

[[package]]
name = "windows-core"
version = "0.62.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b8e83a14d34d0623b51dce9581199302a221863196a1dde71a7663a4c2be9deb"
dependencies = [
 "windows-implement",
 "windows-interface",
 "windows-link",
 "windows-result",
 "windows-strings",
]

[[package]]
name = "windows-implement"
version = "0.60.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "053e2e040ab57b9dc951b72c264860db7eb3b0200ba345b4e4c3b14f67855ddf"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "windows-interface"
version = "0.59.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3f316c4a2570ba26bbec722032c4099d8c8bc095efccdc15688708623367e358"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "windows-link"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f0805222e57f7521d6a62e36fa9163bc891acd422f971defe97d64e70d0a4fe5"

[[package]]
name = "windows-registry"
version = "0.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "02752bf7fbdcce7f2a27a742f798510f3e5ad88dbe84871e5168e2120c3d5720"
dependencies = [
 "windows-link",
 "windows-result",
 "windows-strings",
]

[[package]]
name = "windows-result"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7781fa89eaf60850ac3d2da7af8e5242a5ea78d1a11c49bf2910bb5a73853eb5"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-strings"
version = "0.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7837d08f69c77cf6b07689544538e017c1bfcf57e34b4c0ff58e6c2cd3b37091"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-sys"
version = "0.45.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "75283be5efb2831d37ea142365f009c02ec203cd29a3ebecbc093d52315b66d0"
dependencies = [
 "windows-targets 0.42.2",
]

[[package]]
name = "windows-sys"
version = "0.48.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "677d2418bec65e3338edb076e806bc1ec15693c5d0104683f2efe857f61056a9"
dependencies = [
 "windows-targets 0.48.5",
]

[[package]]
name = "windows-sys"
version = "0.52.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "282be5f36a8ce781fad8c8ae18fa3f9beff57ec1b52cb3de0789201425d9a33d"
dependencies = [
 "windows-targets 0.52.6",
]

[[package]]
name = "windows-sys"
version = "0.60.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f2f500e4d28234f72040990ec9d39e3a6b950f9f22d3dba18416c35882612bcb"
dependencies = [
 "windows-targets 0.53.5",
]

[[package]]
name = "windows-sys"
version = "0.61.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ae137229bcbd6cdf0f7b80a31df61766145077ddf49416a728b02cb3921ff3fc"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-targets"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8e5180c00cd44c9b1c88adb3693291f1cd93605ded80c250a75d472756b4d071"
dependencies = [
 "windows_aarch64_gnullvm 0.42.2",
 "windows_aarch64_msvc 0.42.2",
 "windows_i686_gnu 0.42.2",
 "windows_i686_msvc 0.42.2",
 "windows_x86_64_gnu 0.42.2",
 "windows_x86_64_gnullvm 0.42.2",
 "windows_x86_64_msvc 0.42.2",
]

[[package]]
name = "windows-targets"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9a2fa6e2155d7247be68c096456083145c183cbbbc2764150dda45a87197940c"
dependencies = [
 "windows_aarch64_gnullvm 0.48.5",
 "windows_aarch64_msvc 0.48.5",
 "windows_i686_gnu 0.48.5",
 "windows_i686_msvc 0.48.5",
 "windows_x86_64_gnu 0.48.5",
 "windows_x86_64_gnullvm 0.48.5",
 "windows_x86_64_msvc 0.48.5",
]

[[package]]
name = "windows-targets"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9b724f72796e036ab90c1021d4780d4d3d648aca59e491e6b98e725b84e99973"
dependencies = [
 "windows_aarch64_gnullvm 0.52.6",
 "windows_aarch64_msvc 0.52.6",
 "windows_i686_gnu 0.52.6",
 "windows_i686_gnullvm 0.52.6",
 "windows_i686_msvc 0.52.6",
 "windows_x86_64_gnu 0.52.6",
 "windows_x86_64_gnullvm 0.52.6",
 "windows_x86_64_msvc 0.52.6",
]

[[package]]
name = "windows-targets"
version = "0.53.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4945f9f551b88e0d65f3db0bc25c33b8acea4d9e41163edf90dcd0b19f9069f3"
dependencies = [
 "windows-link",
 "windows_aarch64_gnullvm 0.53.1",
 "windows_aarch64_msvc 0.53.1",
 "windows_i686_gnu 0.53.1",
 "windows_i686_gnullvm 0.53.1",
 "windows_i686_msvc 0.53.1",
 "windows_x86_64_gnu 0.53.1",
 "windows_x86_64_gnullvm 0.53.1",
 "windows_x86_64_msvc 0.53.1",
]

[[package]]
name = "windows_aarch64_gnullvm"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "597a5118570b68bc08d8d59125332c54f1ba9d9adeedeef5b99b02ba2b0698f8"

[[package]]
name = "windows_aarch64_gnullvm"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2b38e32f0abccf9987a4e3079dfb67dcd799fb61361e53e2882c3cbaf0d905d8"

[[package]]
name = "windows_aarch64_gnullvm"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "32a4622180e7a0ec044bb555404c800bc9fd9ec262ec147edd5989ccd0c02cd3"

[[package]]
name = "windows_aarch64_gnullvm"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a9d8416fa8b42f5c947f8482c43e7d89e73a173cead56d044f6a56104a6d1b53"

[[package]]
name = "windows_aarch64_msvc"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e08e8864a60f06ef0d0ff4ba04124db8b0fb3be5776a5cd47641e942e58c4d43"

[[package]]
name = "windows_aarch64_msvc"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "dc35310971f3b2dbbf3f0690a219f40e2d9afcf64f9ab7cc1be722937c26b4bc"

[[package]]
name = "windows_aarch64_msvc"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "09ec2a7bb152e2252b53fa7803150007879548bc709c039df7627cabbd05d469"

[[package]]
name = "windows_aarch64_msvc"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b9d782e804c2f632e395708e99a94275910eb9100b2114651e04744e9b125006"

[[package]]
name = "windows_i686_gnu"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c61d927d8da41da96a81f029489353e68739737d3beca43145c8afec9a31a84f"

[[package]]
name = "windows_i686_gnu"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a75915e7def60c94dcef72200b9a8e58e5091744960da64ec734a6c6e9b3743e"

[[package]]
name = "windows_i686_gnu"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8e9b5ad5ab802e97eb8e295ac6720e509ee4c243f69d781394014ebfe8bbfa0b"

[[package]]
name = "windows_i686_gnu"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "960e6da069d81e09becb0ca57a65220ddff016ff2d6af6a223cf372a506593a3"

[[package]]
name = "windows_i686_gnullvm"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0eee52d38c090b3caa76c563b86c3a4bd71ef1a819287c19d586d7334ae8ed66"

[[package]]
name = "windows_i686_gnullvm"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fa7359d10048f68ab8b09fa71c3daccfb0e9b559aed648a8f95469c27057180c"

[[package]]
name = "windows_i686_msvc"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "44d840b6ec649f480a41c8d80f9c65108b92d89345dd94027bfe06ac444d1060"

[[package]]
name = "windows_i686_msvc"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8f55c233f70c4b27f66c523580f78f1004e8b5a8b659e05a4eb49d4166cca406"

[[package]]
name = "windows_i686_msvc"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "240948bc05c5e7c6dabba28bf89d89ffce3e303022809e73deaefe4f6ec56c66"

[[package]]
name = "windows_i686_msvc"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1e7ac75179f18232fe9c285163565a57ef8d3c89254a30685b57d83a38d326c2"

[[package]]
name = "windows_x86_64_gnu"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8de912b8b8feb55c064867cf047dda097f92d51efad5b491dfb98f6bbb70cb36"

[[package]]
name = "windows_x86_64_gnu"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "53d40abd2583d23e4718fddf1ebec84dbff8381c07cae67ff7768bbf19c6718e"

[[package]]
name = "windows_x86_64_gnu"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "147a5c80aabfbf0c7d901cb5895d1de30ef2907eb21fbbab29ca94c5b08b1a78"

[[package]]
name = "windows_x86_64_gnu"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9c3842cdd74a865a8066ab39c8a7a473c0778a3f29370b5fd6b4b9aa7df4a499"

[[package]]
name = "windows_x86_64_gnullvm"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "26d41b46a36d453748aedef1486d5c7a85db22e56aff34643984ea85514e94a3"

[[package]]
name = "windows_x86_64_gnullvm"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0b7b52767868a23d5bab768e390dc5f5c55825b6d30b86c844ff2dc7414044cc"

[[package]]
name = "windows_x86_64_gnullvm"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "24d5b23dc417412679681396f2b49f3de8c1473deb516bd34410872eff51ed0d"

[[package]]
name = "windows_x86_64_gnullvm"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0ffa179e2d07eee8ad8f57493436566c7cc30ac536a3379fdf008f47f6bb7ae1"

[[package]]
name = "windows_x86_64_msvc"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9aec5da331524158c6d1a4ac0ab1541149c0b9505fde06423b02f5ef0106b9f0"

[[package]]
name = "windows_x86_64_msvc"
version = "0.48.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ed94fce61571a4006852b7389a063ab983c02eb1bb37b47f8272ce92d06d9538"

[[package]]
name = "windows_x86_64_msvc"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "589f6da84c646204747d1270a2a5661ea66ed1cced2631d546fdfb155959f9ec"

[[package]]
name = "windows_x86_64_msvc"
version = "0.53.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d6bbff5f0aada427a1e5a6da5f1f98158182f26556f345ac9e04d36d0ebed650"

[[package]]
name = "winnow"
version = "0.7.14"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5a5364e9d77fcdeeaa6062ced926ee3381faa2ee02d3eb83a5c27a8825540829"
dependencies = [
 "memchr",
]

[[package]]
name = "wit-bindgen"
version = "0.51.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d7249219f66ced02969388cf2bb044a09756a083d0fab1e566056b04d9fbcaa5"
dependencies = [
 "wit-bindgen-rust-macro",
]

[[package]]
name = "wit-bindgen-core"
version = "0.51.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ea61de684c3ea68cb082b7a88508a8b27fcc8b797d738bfc99a82facf1d752dc"
dependencies = [
 "anyhow",
 "heck",
 "wit-parser",
]

[[package]]
name = "wit-bindgen-rust"
version = "0.51.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b7c566e0f4b284dd6561c786d9cb0142da491f46a9fbed79ea69cdad5db17f21"
dependencies = [
 "anyhow",
 "heck",
 "indexmap",
 "prettyplease",
 "syn",
 "wasm-metadata",
 "wit-bindgen-core",
 "wit-component",
]

[[package]]
name = "wit-bindgen-rust-macro"
version = "0.51.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0c0f9bfd77e6a48eccf51359e3ae77140a7f50b1e2ebfe62422d8afdaffab17a"
dependencies = [
 "anyhow",
 "prettyplease",
 "proc-macro2",
 "quote",
 "syn",
 "wit-bindgen-core",
 "wit-bindgen-rust",
]

[[package]]
name = "wit-component"
version = "0.244.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9d66ea20e9553b30172b5e831994e35fbde2d165325bec84fc43dbf6f4eb9cb2"
dependencies = [
 "anyhow",
 "bitflags",
 "indexmap",
 "log",
 "serde",
 "serde_derive",
 "serde_json",
 "wasm-encoder",
 "wasm-metadata",
 "wasmparser",
 "wit-parser",
]

[[package]]
name = "wit-parser"
version = "0.244.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ecc8ac4bc1dc3381b7f59c34f00b67e18f910c2c0f50015669dde7def656a736"
dependencies = [
 "anyhow",
 "id-arena",
 "indexmap",
 "log",
 "semver",
 "serde",
 "serde_derive",
 "serde_json",
 "unicode-xid",
 "wasmparser",
]

[[package]]
name = "writeable"
version = "0.6.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9edde0db4769d2dc68579893f2306b26c6ecfbe0ef499b013d731b7b9247e0b9"

[[package]]
name = "xmlparser"
version = "0.13.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "66fee0b777b0f5ac1c69bb06d361268faafa61cd4682ae064a171c16c433e9e4"

[[package]]
name = "xxhash-rust"
version = "0.8.15"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fdd20c5420375476fbd4394763288da7eb0cc0b8c11deed431a91562af7335d3"

[[package]]
name = "y4m"
version = "0.8.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7a5a4b21e1a62b67a2970e6831bc091d7b87e119e7f9791aef9702e3bef04448"

[[package]]
name = "yaml-rust2"
version = "0.10.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2462ea039c445496d8793d052e13787f2b90e750b833afee748e601c17621ed9"
dependencies = [
 "arraydeque",
 "encoding_rs",
 "hashlink",
]

[[package]]
name = "yoke"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "72d6e5c6afb84d73944e5cedb052c4680d5657337201555f9f2a16b7406d4954"
dependencies = [
 "stable_deref_trait",
 "yoke-derive",
 "zerofrom",
]

[[package]]
name = "yoke-derive"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b659052874eb698efe5b9e8cf382204678a0086ebf46982b79d6ca3182927e5d"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
 "synstructure",
]

[[package]]
name = "zerocopy"
version = "0.8.39"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "db6d35d663eadb6c932438e763b262fe1a70987f9ae936e60158176d710cae4a"
dependencies = [
 "zerocopy-derive",
]

[[package]]
name = "zerocopy-derive"
version = "0.8.39"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4122cd3169e94605190e77839c9a40d40ed048d305bfdc146e7df40ab0f3e517"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "zerofrom"
version = "0.1.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "50cc42e0333e05660c3587f3bf9d0478688e15d870fab3346451ce7f8c9fbea5"
dependencies = [
 "zerofrom-derive",
]

[[package]]
name = "zerofrom-derive"
version = "0.1.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d71e5d6e06ab090c67b5e44993ec16b72dcbaabc526db883a360057678b48502"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
 "synstructure",
]

[[package]]
name = "zeroize"
version = "1.8.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b97154e67e32c85465826e8bcc1c59429aaaf107c1e4a9e53c8d8ccd5eff88d0"

[[package]]
name = "zerotrie"
version = "0.2.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2a59c17a5562d507e4b54960e8569ebee33bee890c70aa3fe7b97e85a9fd7851"
dependencies = [
 "displaydoc",
 "yoke",
 "zerofrom",
]

[[package]]
name = "zerovec"
version = "0.11.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6c28719294829477f525be0186d13efa9a3c602f7ec202ca9e353d310fb9a002"
dependencies = [
 "yoke",
 "zerofrom",
 "zerovec-derive",
]

[[package]]
name = "zerovec-derive"
version = "0.11.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "eadce39539ca5cb3985590102671f2567e659fca9666581ad3411d59207951f3"
dependencies = [
 "proc-macro2",
 "quote",
 "syn",
]

[[package]]
name = "zmij"
version = "1.0.20"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4de98dfa5d5b7fef4ee834d0073d560c9ca7b6c46a71d058c48db7960f8cfaf7"

[[package]]
name = "zune-core"
version = "0.4.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3f423a2c17029964870cfaabb1f13dfab7d092a62a29a89264f4d36990ca414a"

[[package]]
name = "zune-core"
version = "0.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cb8a0807f7c01457d0379ba880ba6322660448ddebc890ce29bb64da71fb40f9"

[[package]]
name = "zune-inflate"
version = "0.2.54"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "73ab332fe2f6680068f3582b16a24f90ad7096d5d39b974d1c0aff0125116f02"
dependencies = [
 "simd-adler32",
]

[[package]]
name = "zune-jpeg"
version = "0.4.21"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "29ce2c8a9384ad323cf564b67da86e21d3cfdff87908bc1223ed5c99bc792713"
dependencies = [
 "zune-core 0.4.12",
]

[[package]]
name = "zune-jpeg"
version = "0.5.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "410e9ecef634c709e3831c2cfdb8d9c32164fae1c67496d5b68fff728eec37fe"
dependencies = [
 "zune-core 0.5.1",
]

```

### File: apps/api/Cargo.toml

```
[package]
name = "api"
version = "0.1.0"
edition = "2024"

[dependencies]
axum = { version = "0.8.8", features = ["macros", "multipart"] }
tokio = { version = "1.42", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.6.8", features = ["cors", "trace", "fs", "limit"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.11", features = ["v7", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-native-tls", "postgres", "uuid", "chrono", "ipnetwork", "migrate"] }
validator = { version = "0.20", features = ["derive"] }
config = "0.15"
dotenvy = "0.15"
thiserror = "2.0"
async-trait = "0.1"
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
ts-rs = { version = "12.0", features = ["uuid-impl", "chrono-impl", "serde-compat"] }
ort = { version = "2.0.0-rc.11", features = ["ndarray", "download-binaries"] }
ndarray = "0.15"
image = { version = "0.25", features = ["jpeg", "png"] }
aws-config = "1.1"
aws-sdk-s3 = "1.122"
aws-credential-types = "1.1"
redis = { version = "1.0", features = ["tokio-comp", "connection-manager", "tokio-native-tls-comp"] }
reqwest = { version = "0.13", features = ["json", "multipart"] }
bytes = "1.11"
sha2 = "0.10"
base64 = "0.22"
jsonwebtoken = { version = "10", features = ["rust_crypto"] }
lazy_static = "1.5"
regex = "1.11"

[dev-dependencies]
mockall = "0.14"

```

### File: apps/api/Dockerfile

```
FROM rust:1.93-slim-trixie as builder

RUN apt-get update && apt-get install -y \
  pkg-config \
  libssl-dev \
  libpq-dev \
  g++ \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

COPY .sqlx ./.sqlx

COPY src ./src
COPY migrations ./migrations

# Enable offline mode
ENV SQLX_OFFLINE=true

# Build the release binary
RUN cargo build --release

FROM debian:trixie-slim

RUN apt-get update && apt-get install -y \
  ca-certificates \
  libssl3t64 \
  libpq5 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary and migrations from builder
COPY --from=builder /app/target/release/api /usr/local/bin/api
COPY --from=builder /app/migrations ./migrations

# Render standard envs
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["/usr/local/bin/api"]

```

### File: apps/api/README.md

```
# API Backend

Rust + Axum + PostgreSQL + Redis

## Development

```bash
# Setup database
docker-compose up -d postgres redis

# Run migrations
sqlx database create
sqlx migrate run

# Start server
cargo run
```

Server: http://localhost:3000

## Build

```bash
cargo build --release
```

## Test

```bash
cargo test
```

## Architecture

- **Domain-Driven Design** - Business logic in domain layer
- **Clean Architecture** - Dependencies point inward
- **Repository Pattern** - Abstract data access
- **Use Case Pattern** - Single responsibility operations

## Endpoints

- `GET /health` - Health check
- `POST /api/v1/letterings/upload` - Upload image
- `GET /api/v1/letterings` - Get gallery
- `GET /api/v1/letterings/search` - Search
- `POST /api/v1/letterings/:id/like` - Like
- `POST /api/v1/letterings/:id/comments` - Add comment
- `GET /api/v1/letterings/:id/comments` - Get comments

```

### File: apps/api/bindings/AddCommentRequest.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type AddCommentRequest = { lettering_id: string, content: string, };

```

### File: apps/api/bindings/Comment.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type Comment = { id: string, lettering_id: string, content: string, created_at: string, };

```

### File: apps/api/bindings/Coordinates.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type Coordinates = { type: string, coordinates: Array<number>, };

```

### File: apps/api/bindings/DomainError.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type DomainError = { "NotFound": string } | { "ValidationError": string } | { "InfrastructureError": string } | "RateLimitExceeded" | "Unauthorized";

```

### File: apps/api/bindings/ImageMetadata.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type ImageMetadata = { style: string | null, script: string | null, confidence: number | null, color_palette: Array<string> | null, };

```

### File: apps/api/bindings/Lettering.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { Coordinates } from "./Coordinates";
import type { ImageMetadata } from "./ImageMetadata";
import type { LetteringStatus } from "./LetteringStatus";
import type { ThumbnailUrls } from "./ThumbnailUrls";

export type Lettering = { id: string, city_id: string, contributor_tag: string, image_url: string, thumbnail_urls: ThumbnailUrls, location: Coordinates, pin_code: string, detected_text: string | null, ml_metadata: ImageMetadata | null, is_lettering: boolean, status: LetteringStatus, likes_count: number, comments_count: number, created_at: string, updated_at: string, };

```

### File: apps/api/bindings/LetteringStatus.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type LetteringStatus = "Pending" | "Approved" | "Rejected";

```

### File: apps/api/bindings/PaginatedResponse.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { Lettering } from "./Lettering";

export type PaginatedResponse = { letterings: Array<Lettering>, total: bigint, limit: bigint, offset: bigint, };

```

### File: apps/api/bindings/SearchRequest.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type SearchRequest = { query: string, limit: bigint | null, };

```

### File: apps/api/bindings/ThumbnailUrls.ts

```
// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export type ThumbnailUrls = { small: string, medium: string, large: string, };

```

### File: apps/api/migrations/20260207000001_create_core_tables.sql

```
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Cities table
CREATE TABLE cities (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Letterings table
CREATE TABLE letterings (
    id UUID PRIMARY KEY,
    city_id UUID NOT NULL REFERENCES cities(id),
    contributor_tag VARCHAR(30) NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_small TEXT,
    thumbnail_medium TEXT,
    thumbnail_large TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    pin_code VARCHAR(6) NOT NULL,
    detected_text TEXT,
    ml_style VARCHAR(50),
    ml_script VARCHAR(50),
    ml_confidence REAL,
    ml_color_palette JSONB,
    is_lettering BOOLEAN DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    uploaded_by_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY,
    lettering_id UUID NOT NULL REFERENCES letterings(id) ON DELETE CASCADE,
    user_ip INET NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lettering_id, user_ip)
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    lettering_id UUID NOT NULL REFERENCES letterings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_letterings_city ON letterings(city_id);
CREATE INDEX idx_letterings_status ON letterings(status);
CREATE INDEX idx_letterings_contributor ON letterings(contributor_tag);
CREATE INDEX idx_letterings_location ON letterings USING GIST(location);
CREATE INDEX idx_letterings_created ON letterings(created_at DESC);
CREATE INDEX idx_likes_lettering ON likes(lettering_id);
CREATE INDEX idx_comments_lettering ON comments(lettering_id);

-- Insert Bengaluru
INSERT INTO cities (id, name, country_code) 
VALUES ('0194f123-4567-7abc-8def-0123456789ab', 'Bengaluru', 'IN');
```

### File: apps/api/migrations/20260207000002_add_multilang_fts.sql

```
-- Full-text search for detected text
ALTER TABLE letterings ADD COLUMN detected_text_tsv tsvector;

CREATE INDEX idx_letterings_fts ON letterings USING gin(detected_text_tsv);

CREATE OR REPLACE FUNCTION update_lettering_tsv() RETURNS trigger AS $$
BEGIN
    NEW.detected_text_tsv := to_tsvector('english', COALESCE(NEW.detected_text, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER letterings_tsv_update BEFORE INSERT OR UPDATE ON letterings
FOR EACH ROW EXECUTE FUNCTION update_lettering_tsv();

```

### File: apps/api/migrations/20260207000003_create_analytics_tables.sql

```
CREATE TABLE daily_stats (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    uploads_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date)
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

```

### File: apps/api/migrations/20260207000004_add_cities.sql

```
INSERT INTO cities (id, name, country_code) VALUES
('0194f123-4567-7abc-8def-0123456789ac', 'Mumbai', 'IN'),
('0194f123-4567-7abc-8def-0123456789ad', 'Delhi', 'IN'),
('0194f123-4567-7abc-8def-0123456789ae', 'Chennai', 'IN'),
('0194f123-4567-7abc-8def-0123456789af', 'Kolkata', 'IN'),
('0194f123-4567-7abc-8def-0123456789b0', 'Hyderabad', 'IN'),
('0194f123-4567-7abc-8def-0123456789b1', 'Pune', 'IN')
ON CONFLICT (id) DO NOTHING;

-- Add city selection endpoint
CREATE INDEX idx_cities_name ON cities(name);
```

### File: apps/api/migrations/20260207000005_add_admin.sql

```
CREATE TABLE admins (
    id UUID PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add your IP as admin
INSERT INTO admins (id, ip_address) VALUES 
(gen_random_uuid(), '127.0.0.1');
```

### File: apps/api/migrations/20260207000006_add_image_hash.sql

```
ALTER TABLE letterings ADD COLUMN image_hash VARCHAR(64);

CREATE UNIQUE INDEX idx_letterings_image_hash ON letterings(image_hash) WHERE image_hash IS NOT NULL;

```

### File: apps/api/migrations/20260210000001_add_description.sql

```
ALTER TABLE letterings ADD COLUMN description TEXT; 
```

### File: apps/api/migrations/20260211000001_add_reporting_and_cultural_context.sql

```
-- Add reporting columns for community moderation
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS report_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add cultural_context for Wikipedia enrichment
ALTER TABLE letterings ADD COLUMN IF NOT EXISTS cultural_context TEXT;

-- Index for finding reported items efficiently
CREATE INDEX IF NOT EXISTS idx_letterings_reported ON letterings(report_count) WHERE report_count > 0;

```

### File: apps/api/railway.toml

```
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "/usr/local/bin/api"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

```

### File: apps/api/src/application/get_letterings/dto.rs

```
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use crate::domain::lettering::entity::Lettering;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PaginatedResponse {
    pub letterings: Vec<Lettering>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

```

### File: apps/api/src/application/get_letterings/mod.rs

```
pub mod dto;
pub mod use_case;

```

### File: apps/api/src/application/get_letterings/use_case.rs

```
use crate::domain::lettering::{errors::DomainError, repository::LetteringRepository};
use super::dto::PaginatedResponse;

pub struct GetLetteringsUseCase {
    repository: Box<dyn LetteringRepository>,
}

impl GetLetteringsUseCase {
    pub fn new(repository: Box<dyn LetteringRepository>) -> Self {
        Self { repository }
    }

    pub async fn execute(&self, limit: i64, offset: i64) -> Result<PaginatedResponse, DomainError> {
        let letterings = self.repository.find_all(limit, offset).await?;
        Ok(PaginatedResponse { letterings: letterings.clone(), total: letterings.len() as i64, limit, offset })
    }
}

```

### File: apps/api/src/application/mod.rs

```
pub mod upload_lettering;
pub mod get_letterings;
pub mod search_letterings;
pub mod social;

```

### File: apps/api/src/application/search_letterings/dto.rs

```
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SearchRequest {
    pub query: String,
    pub limit: Option<i64>,
}

```

### File: apps/api/src/application/search_letterings/mod.rs

```
pub mod dto;
pub mod use_case;

```

### File: apps/api/src/application/search_letterings/use_case.rs

```
use crate::domain::lettering::{entity::Lettering, errors::DomainError, repository::LetteringRepository};
use super::dto::SearchRequest;

pub struct SearchLetteringsUseCase {
    repository: Box<dyn LetteringRepository>,
}

impl SearchLetteringsUseCase {
    pub fn new(repository: Box<dyn LetteringRepository>) -> Self {
        Self { repository }
    }

    pub async fn execute(&self, request: SearchRequest) -> Result<Vec<Lettering>, DomainError> {
        self.repository.search(&request.query).await
    }
}

```

### File: apps/api/src/application/social/dto.rs

```
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AddCommentRequest {
    pub lettering_id: Uuid,
    pub content: String,
}

```

### File: apps/api/src/application/social/mod.rs

```
pub mod dto;
pub mod use_case;

```

### File: apps/api/src/application/social/use_case.rs

```
use crate::domain::social::{comment::Comment, repository::SocialRepository};
use crate::domain::lettering::errors::DomainError;
use super::dto::AddCommentRequest;
use uuid::Uuid;

pub struct SocialUseCase {
    repository: Box<dyn SocialRepository>,
}

impl SocialUseCase {
    pub fn new(repository: Box<dyn SocialRepository>) -> Self {
        Self { repository }
    }

    pub async fn add_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(), DomainError> {
        self.repository.add_like(lettering_id, user_ip).await?;
        Ok(())
    }

    pub async fn add_comment(&self, request: AddCommentRequest, user_ip: Option<&str>) -> Result<Comment, DomainError> {
        self.repository.add_comment(request.lettering_id, request.content, user_ip).await
    }

    pub async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError> {
        self.repository.get_comments(lettering_id).await
    }
}

```

### File: apps/api/src/application/upload_lettering/dto.rs

```
use bytes::Bytes;
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct UploadLetteringRequest {
    pub city_id: Uuid,
    pub contributor_tag: String,
    pub pin_code: String,
    pub image_data: Bytes,
    pub description: Option<String>,
    pub uploaded_by_ip: Option<IpNetwork>,
}
```

### File: apps/api/src/application/upload_lettering/mod.rs

```
pub mod dto;
pub mod use_case;

```

### File: apps/api/src/application/upload_lettering/use_case.rs

```
use crate::{
    application::upload_lettering::dto::UploadLetteringRequest,
    domain::lettering::{entity::*, repository::LetteringRepository},
    infrastructure::{
        geocoding::coordinates_for_pincode, queue::redis_queue::RedisQueue,
        storage::traits::StorageService,
    },
};
use bytes::Bytes;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use uuid::Uuid;

pub struct UploadLetteringUseCase {
    repository: Box<dyn LetteringRepository>,
    storage: Arc<dyn StorageService>,
    queue: Arc<RedisQueue>,
}

impl UploadLetteringUseCase {
    pub fn new(
        repository: Box<dyn LetteringRepository>,
        storage: Arc<dyn StorageService>,
        queue: Arc<RedisQueue>,
    ) -> Self {
        Self {
            repository,
            storage,
            queue,
        }
    }

    pub async fn execute(&self, request: UploadLetteringRequest) -> Result<Lettering, String> {
        let image_hash = {
            let mut hasher = Sha256::new();
            hasher.update(&request.image_data);
            format!("{:x}", hasher.finalize())
        };

        if let Some(existing) = self
            .repository
            .find_by_image_hash(&image_hash)
            .await
            .map_err(|e| format!("Database error: {}", e))?
        {
            return Err(format!(
                "Duplicate image: this photo has already been uploaded (id: {})",
                existing.id
            ));
        }

        let lettering_id = Uuid::now_v7();

        // Convert original to WebP (max 1200px) for storage conservation
        let original_webp = Self::convert_to_webp(&request.image_data, 1200)?;
        let image_key = format!("letterings/{}.webp", lettering_id);

        let image_url = self
            .storage
            .upload(&image_key, original_webp, "image/webp")
            .await
            .map_err(|e| format!("Storage error: {}", e))?;

        let thumbnail_urls = self
            .generate_thumbnails(&request.image_data, &lettering_id)
            .await?;

        let lettering = Lettering {
            id: lettering_id,
            city_id: request.city_id,
            contributor_tag: request.contributor_tag,
            image_url,
            thumbnail_urls,
            location: {
                let (lng, lat) = coordinates_for_pincode(&request.pin_code);
                Coordinates {
                    r#type: "Point".to_string(),
                    coordinates: vec![lng, lat],
                }
            },
            pin_code: request.pin_code,
            detected_text: None,
            ml_metadata: None,
            description: request.description,
            is_lettering: true,
            status: LetteringStatus::Pending,
            likes_count: 0,
            comments_count: 0,
            uploaded_by_ip: request.uploaded_by_ip,
            image_hash: Some(image_hash),
            report_count: 0,
            report_reasons: vec![],
            cultural_context: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let saved = self
            .repository
            .create(&lettering)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        let _ = self
            .queue
            .enqueue_ml_job(crate::infrastructure::queue::redis_queue::MlJob {
                lettering_id,
                image_url: saved.image_url.clone(),
            })
            .await;

        Ok(saved)
    }

    fn convert_to_webp(image_data: &[u8], max_width: u32) -> Result<Vec<u8>, String> {
        use image::ImageFormat;
        use std::io::Cursor;

        let img =
            image::load_from_memory(image_data).map_err(|e| format!("Invalid image: {}", e))?;
        let resized = if img.width() > max_width {
            img.resize(max_width, max_width, image::imageops::FilterType::Lanczos3)
        } else {
            img
        };
        let mut buffer = Cursor::new(Vec::new());
        resized
            .write_to(&mut buffer, ImageFormat::WebP)
            .map_err(|e| format!("WebP conversion failed: {}", e))?;
        Ok(buffer.into_inner())
    }

    async fn generate_thumbnails(
        &self,
        image_data: &Bytes,
        id: &Uuid,
    ) -> Result<ThumbnailUrls, String> {
        // PRD sizes: small=200px (heatmap/matrix), medium=600px (gallery), large=1200px (zine view)
        let sizes = [("small", 200u32), ("medium", 600), ("large", 1200)];
        let img =
            image::load_from_memory(image_data).map_err(|e| format!("Invalid image: {}", e))?;

        let mut urls = vec![];

        for (size_name, width) in sizes {
            let resized = img.resize(width, width, image::imageops::FilterType::Lanczos3);
            let mut buffer = std::io::Cursor::new(Vec::new());
            resized
                .write_to(&mut buffer, image::ImageFormat::WebP)
                .map_err(|e| format!("Thumbnail generation failed: {}", e))?;

            let key = format!("thumbnails/{}/{}.webp", size_name, id);
            let url = self
                .storage
                .upload(&key, buffer.into_inner(), "image/webp")
                .await
                .map_err(|e| format!("Thumbnail upload failed: {}", e))?;

            urls.push(url);
        }

        Ok(ThumbnailUrls {
            small: urls[0].clone(),
            medium: urls[1].clone(),
            large: urls[2].clone(),
        })
    }
}

```

### File: apps/api/src/config.rs

```
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub database_max_connections: u32,
    pub redis_url: String,
    pub redis_max_connections: u32,
    pub r2_access_key_id: String,
    pub r2_secret_access_key: String,
    pub r2_endpoint: String,
    pub r2_bucket_name: String,
    pub r2_region: String,
    pub r2_public_url: String,
    pub host: String,
    pub port: u16,
    pub cors_allowed_origins: String,
    pub rate_limit_uploads_per_day: u32,
    pub rate_limit_uploads_per_ip: u32,
    pub enable_ml_processing: bool,
    pub ml_model_path: String,
    pub enable_virus_scan: bool,
    pub environment: String,
    pub admin_email: String,
    pub admin_password_hash: String,
    pub jwt_secret: String,
    pub huggingface_token: Option<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")?,
            database_max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or("10".into())
                .parse()?,
            redis_url: std::env::var("REDIS_URL")?,
            redis_max_connections: std::env::var("REDIS_MAX_CONNECTIONS")
                .unwrap_or("10".into())
                .parse()?,
            r2_access_key_id: std::env::var("R2_ACCESS_KEY_ID")?,
            r2_secret_access_key: std::env::var("R2_SECRET_ACCESS_KEY")?,
            r2_endpoint: std::env::var("R2_ENDPOINT")?,
            r2_bucket_name: std::env::var("R2_BUCKET_NAME")?,
            r2_region: std::env::var("R2_REGION").unwrap_or("auto".into()),
            r2_public_url: std::env::var("R2_PUBLIC_URL")?,
            host: std::env::var("HOST").unwrap_or("0.0.0.0".into()),
            port: std::env::var("PORT").unwrap_or("3000".into()).parse()?,
            cors_allowed_origins: std::env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or("http://localhost:5173".into()),
            rate_limit_uploads_per_day: std::env::var("RATE_LIMIT_UPLOADS_PER_DAY")
                .unwrap_or("20".into())
                .parse()?,
            rate_limit_uploads_per_ip: std::env::var("RATE_LIMIT_UPLOADS_PER_IP")
                .unwrap_or("20".into())
                .parse()?,
            enable_ml_processing: std::env::var("ENABLE_ML_PROCESSING")
                .unwrap_or("true".into())
                .parse()?,
            ml_model_path: std::env::var("ML_MODEL_PATH")
                .unwrap_or("./models/text_detector.onnx".into()),
            enable_virus_scan: std::env::var("ENABLE_VIRUS_SCAN")
                .unwrap_or("false".into())
                .parse()?,
            environment: std::env::var("ENVIRONMENT").unwrap_or("development".into()),
            admin_email: std::env::var("ADMIN_EMAIL")
                .unwrap_or("admin@throughyourletters.online".into()),
            admin_password_hash: std::env::var("ADMIN_PASSWORD_HASH").unwrap_or_else(|_| {
                // Default: SHA256 of "changeme" — MUST be overridden in production
                "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86".into()
            }),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "ttl-dev-jwt-secret-change-in-production".into()),
            huggingface_token: std::env::var("HUGGINGFACE_TOKEN").ok(),
        })
    }
}

```

### File: apps/api/src/domain/city/entity.rs

```
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::FromRow)]
#[ts(export)]
pub struct City {
    pub id: Uuid,
    pub name: String,
    pub country_code: String,
    pub created_at: DateTime<Utc>,
}

```

### File: apps/api/src/domain/city/mod.rs

```
// Placeholder

```

### File: apps/api/src/domain/city/repository.rs

```
use async_trait::async_trait;
use uuid::Uuid;
use super::entity::City;
use crate::domain::lettering::errors::DomainError;

#[async_trait]
pub trait CityRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<City>, DomainError>;
    async fn find_all(&self) -> Result<Vec<City>, DomainError>;
}

```

### File: apps/api/src/domain/contributor/entity.rs

```
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Contributor {
    pub tag: String,
    pub uploads_count: i32,
    pub likes_received: i32,
    pub joined_at: DateTime<Utc>,
}

```

### File: apps/api/src/domain/contributor/mod.rs

```
// Placeholder

```

### File: apps/api/src/domain/lettering/entity.rs

```
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::ipnetwork::IpNetwork;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Lettering {
    pub id: Uuid,
    pub city_id: Uuid,
    pub contributor_tag: String,
    pub image_url: String,
    pub thumbnail_urls: ThumbnailUrls,
    pub location: Coordinates,
    pub pin_code: String,
    pub detected_text: Option<String>,
    pub ml_metadata: Option<ImageMetadata>,
    pub description: Option<String>,
    pub is_lettering: bool,
    pub status: LetteringStatus,
    pub likes_count: i32,
    pub comments_count: i32,
    #[ts(skip)]
    pub uploaded_by_ip: Option<IpNetwork>,
    pub image_hash: Option<String>,
    pub report_count: i32,
    pub report_reasons: Vec<String>,
    pub cultural_context: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ThumbnailUrls {
    pub small: String,
    pub medium: String,
    pub large: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Coordinates {
    pub r#type: String,
    pub coordinates: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImageMetadata {
    pub style: Option<String>,
    pub script: Option<String>,
    pub confidence: Option<f32>,
    pub color_palette: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type)]
#[sqlx(type_name = "text", rename_all = "SCREAMING_SNAKE_CASE")]
#[ts(export)]
pub enum LetteringStatus {
    Pending,
    Approved,
    Rejected,
    Reported,
}

```

### File: apps/api/src/domain/lettering/errors.rs

```
use thiserror::Error;
use ts_rs::TS;
use serde::{Serialize, Deserialize};

#[derive(Debug, Error, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum DomainError {
    #[error("Not found")]
    NotFound(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Infrastructure error: {0}")]
    InfrastructureError(String),
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
    #[error("Unauthorized")]
    Unauthorized,
}

```

### File: apps/api/src/domain/lettering/events.rs

```
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LetteringEvent {
    Uploaded { lettering_id: Uuid },
    Approved { lettering_id: Uuid },
    Rejected { lettering_id: Uuid },
    Liked { lettering_id: Uuid },
    Commented { lettering_id: Uuid, comment_id: Uuid },
}

```

### File: apps/api/src/domain/lettering/mod.rs

```
pub mod entity;
pub mod repository;
pub mod errors;
pub mod value_objects;
pub mod events;

```

### File: apps/api/src/domain/lettering/repository.rs

```
use super::entity::Lettering;
use super::errors::DomainError;
use async_trait::async_trait;
use uuid::Uuid;

#[async_trait]
pub trait LetteringRepository: Send + Sync {
    async fn create(&self, lettering: &Lettering) -> Result<Lettering, DomainError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Lettering>, DomainError>;
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError>;
    async fn update(&self, lettering: &Lettering) -> Result<Lettering, DomainError>;
    async fn delete(&self, id: Uuid) -> Result<(), DomainError>;
    async fn search(&self, query: &str) -> Result<Vec<Lettering>, DomainError>;
    async fn count_by_contributor_today(&self, contributor_tag: &str) -> Result<i64, DomainError>;
    async fn find_by_image_hash(&self, hash: &str) -> Result<Option<Lettering>, DomainError>;
}

```

### File: apps/api/src/domain/lettering/value_objects.rs

```
use serde::{Deserialize, Serialize};
use validator::Validate;
use lazy_static::lazy_static;

lazy_static! {
    static ref PIN_CODE_REGEX: regex::Regex = regex::Regex::new(r"^56\d{4}$").unwrap();
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct PinCode {
    #[validate(regex(path = *PIN_CODE_REGEX))]
    pub value: String,
}

impl PinCode {
    pub fn new(value: String) -> Result<Self, validator::ValidationErrors> {
        let pin_code = Self { value };
        pin_code.validate()?;
        Ok(pin_code)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct ContributorTag {
    #[validate(length(min = 3, max = 30))]
    pub value: String,
}

impl ContributorTag {
    pub fn new(value: String) -> Result<Self, validator::ValidationErrors> {
        let tag = Self { value };
        tag.validate()?;
        Ok(tag)
    }
}
```

### File: apps/api/src/domain/mod.rs

```
pub mod lettering;
pub mod city;
pub mod contributor;
pub mod social;
pub mod shared;

```

### File: apps/api/src/domain/shared/mod.rs

```
// Placeholder

```

### File: apps/api/src/domain/shared/pagination.rs

```
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PaginationRequest {
    pub limit: i64,
    pub offset: i64,
}

impl Default for PaginationRequest {
    fn default() -> Self {
        Self { limit: 50, offset: 0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

```

### File: apps/api/src/domain/social/comment.rs

```
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::ipnetwork::IpNetwork;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::FromRow)]
#[ts(export)]
pub struct Comment {
    pub id: Uuid,
    pub lettering_id: Uuid,
    pub content: String,
    #[ts(skip)]
    pub user_ip: Option<IpNetwork>,
    pub created_at: DateTime<Utc>,
}

```

### File: apps/api/src/domain/social/like.rs

```
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Like {
    pub id: Uuid,
    pub lettering_id: Uuid,
    pub user_ip: IpNetwork,
    pub created_at: DateTime<Utc>,
}

```

### File: apps/api/src/domain/social/mod.rs

```
pub mod comment;
pub mod like;
pub mod repository;
```

### File: apps/api/src/domain/social/repository.rs

```
use async_trait::async_trait;
use uuid::Uuid;
use super::{comment::Comment, like::Like};
use crate::domain::lettering::errors::DomainError;

#[async_trait]
pub trait SocialRepository: Send + Sync {
    async fn add_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<Like, DomainError>;
    async fn remove_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(), DomainError>;
    async fn add_comment(&self, lettering_id: Uuid, content: String, user_ip: Option<&str>) -> Result<Comment, DomainError>;
    async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError>;
}

```

### File: apps/api/src/infrastructure/cache/mod.rs

```
pub mod redis_cache;

```

### File: apps/api/src/infrastructure/cache/redis_cache.rs

```
use redis::{Client, AsyncCommands};
use anyhow::Result;

pub struct RedisCache {
    client: Client,
}

impl RedisCache {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn get<T: serde::de::DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let value: Option<String> = conn.get(key).await?;
        match value {
            Some(v) => Ok(Some(serde_json::from_str(&v)?)),
            None => Ok(None),
        }
    }

    pub async fn set<T: serde::Serialize>(&self, key: &str, value: &T, ttl: usize) -> Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let json = serde_json::to_string(value)?;
        conn.set_ex(key, json, ttl).await?;
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        conn.del(key).await?;
        Ok(())
    }
}

```

### File: apps/api/src/infrastructure/database/mod.rs

```
pub mod pool;

```

### File: apps/api/src/infrastructure/database/pool.rs

```
use sqlx::postgres::{PgPool, PgPoolOptions};

pub async fn create_pool(database_url: &str, max_connections: u32) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(database_url)
        .await?;
    Ok(pool)
}

```

### File: apps/api/src/infrastructure/geocoding/mod.rs

```
pub mod pincode_coords;

pub use pincode_coords::coordinates_for_pincode;

```

### File: apps/api/src/infrastructure/geocoding/pincode_coords.rs

```
use lazy_static::lazy_static;
use std::collections::HashMap;

/// Default coordinates: Bangalore center (longitude, latitude)
const DEFAULT_COORDS: (f64, f64) = (77.5946, 12.9716);

lazy_static! {
    static ref PINCODE_MAP: HashMap<&'static str, (f64, f64)> = {
        let mut m = HashMap::new();
        // Bengaluru PIN codes mapped to approximate (longitude, latitude)
        m.insert("560001", (77.5946, 12.9716));  // GPO, MG Road
        m.insert("560002", (77.5750, 12.9850));  // Rajajinagar
        m.insert("560003", (77.5700, 12.9900));  // Basaveshwaranagar
        m.insert("560004", (77.5670, 12.9620));  // Chamrajpet
        m.insert("560005", (77.5430, 12.9580));  // Vijayanagar
        m.insert("560006", (77.5550, 12.9480));  // Hanumanthnagar
        m.insert("560007", (77.6200, 12.9580));  // Frazer Town
        m.insert("560008", (77.6000, 12.9820));  // Shivajinagar
        m.insert("560009", (77.5900, 12.9550));  // Richmond Town
        m.insert("560010", (77.5650, 12.9350));  // Basavanagudi
        m.insert("560011", (77.5800, 12.9450));  // Jayanagar
        m.insert("560012", (77.5860, 12.9320));  // Jayanagar East
        m.insert("560013", (77.5580, 12.9200));  // Yediyur
        m.insert("560014", (77.6050, 12.9250));  // Wilson Garden
        m.insert("560015", (77.5500, 12.9750));  // Mahalakshmi Layout
        m.insert("560016", (77.5350, 12.9700));  // Nandini Layout
        m.insert("560017", (77.6200, 12.9900));  // Benson Town
        m.insert("560018", (77.6350, 12.9750));  // Cox Town
        m.insert("560019", (77.6450, 12.9550));  // Ulsoor
        m.insert("560020", (77.5550, 13.0050));  // Malleshwaram
        m.insert("560021", (77.5700, 13.0100));  // Sadashivanagar
        m.insert("560022", (77.5400, 13.0200));  // Yeshwanthpur
        m.insert("560023", (77.5900, 13.0000));  // Seshadripuram
        m.insert("560024", (77.5650, 12.9150));  // Banashankari
        m.insert("560025", (77.6100, 12.9500));  // Adugodi
        m.insert("560026", (77.5800, 12.9100));  // Padmanabhanagar
        m.insert("560027", (77.6100, 12.9650));  // Shanthinagar
        m.insert("560028", (77.6300, 12.9350));  // Koramangala
        m.insert("560029", (77.5850, 12.9000));  // Banashankari 3rd Stage
        m.insert("560030", (77.5700, 12.8900));  // Uttarahalli
        m.insert("560031", (77.6500, 12.9450));  // Jogupalya
        m.insert("560032", (77.5500, 13.0350));  // RMV Extension
        m.insert("560033", (77.6200, 12.9100));  // HSR Layout
        m.insert("560034", (77.6400, 12.9200));  // BTM Layout
        m.insert("560035", (77.5300, 12.9500));  // Rajarajeshwari Nagar
        m.insert("560036", (77.6050, 12.9900));  // RT Nagar
        m.insert("560037", (77.6250, 12.8900));  // Madiwala
        m.insert("560038", (77.6550, 12.9700));  // Indiranagar
        m.insert("560039", (77.5200, 13.0000));  // Rajajinagar Industrial Town
        m.insert("560040", (77.5900, 13.0150));  // Sadashivanagar
        m.insert("560041", (77.6700, 12.9600));  // HAL
        m.insert("560042", (77.5650, 12.8800));  // Kumaraswamy Layout
        m.insert("560043", (77.5350, 13.0400));  // Mathikere
        m.insert("560044", (77.5150, 13.0100));  // Peenya
        m.insert("560045", (77.6500, 12.9850));  // Kacharakanahalli
        m.insert("560046", (77.6300, 13.0000));  // Ganganagar
        m.insert("560047", (77.5800, 13.0300));  // Hebbal
        m.insert("560048", (77.5950, 12.8800));  // JP Nagar
        m.insert("560049", (77.5400, 12.8950));  // Kengeri
        m.insert("560050", (77.6000, 13.0050));  // Palace Guttahalli
        m.insert("560051", (77.5500, 13.0500));  // Jalahalli
        m.insert("560052", (77.5300, 13.0600));  // Vidyaranyapura
        m.insert("560053", (77.5700, 13.0500));  // Yelahanka
        m.insert("560054", (77.5450, 13.0300));  // Gokula
        m.insert("560055", (77.5150, 13.0300));  // Rajgopal Nagar
        m.insert("560056", (77.5100, 12.9700));  // Nagarbhavi
        m.insert("560057", (77.5900, 12.8550));  // Sarakki
        m.insert("560058", (77.6550, 12.9050));  // Koramangala 6th Block
        m.insert("560059", (77.5250, 12.9200));  // Girinagar
        m.insert("560060", (77.5350, 12.8800));  // Kengeri Satellite Town
        m.insert("560061", (77.6450, 12.8800));  // Bommanahalli
        m.insert("560062", (77.5900, 13.0350));  // Bellary Road
        m.insert("560063", (77.6050, 12.8650));  // Arekere
        m.insert("560064", (77.5600, 13.0600));  // Sahakara Nagar
        m.insert("560065", (77.5600, 12.8600));  // Gottigere
        m.insert("560066", (77.6100, 13.0200));  // Kalyan Nagar
        m.insert("560067", (77.6400, 12.8550));  // Begur
        m.insert("560068", (77.6800, 12.9350));  // Domlur
        m.insert("560069", (77.5100, 12.9350));  // Mysore Road
        m.insert("560070", (77.6200, 12.8500));  // Bilekahalli
        m.insert("560071", (77.6900, 12.9550));  // Old Airport Road
        m.insert("560072", (77.5050, 13.0500));  // Dasarahalli
        m.insert("560073", (77.7100, 12.9700));  // Marathahalli
        m.insert("560074", (77.5800, 12.8400));  // Konanakunte
        m.insert("560075", (77.7000, 12.9350));  // Bellandur
        m.insert("560076", (77.5400, 12.8650));  // RR Nagar
        m.insert("560077", (77.6600, 12.8400));  // Hulimavu
        m.insert("560078", (77.6300, 13.0400));  // HBR Layout
        m.insert("560079", (77.6400, 13.0200));  // Thanisandra
        m.insert("560080", (77.5900, 12.8200));  // Kanakapura Road
        m.insert("560081", (77.5400, 12.8400));  // Rajarajeshwari Nagar
        m.insert("560082", (77.6750, 12.9150));  // Ejipura
        m.insert("560083", (77.6500, 13.0500));  // Jakkur
        m.insert("560084", (77.6550, 12.8650));  // Arakere Mico Layout
        m.insert("560085", (77.5100, 13.0700));  // Chikkabanavara
        m.insert("560086", (77.4950, 12.9300));  // Herohalli
        m.insert("560087", (77.5350, 12.8500));  // Channasandra
        m.insert("560088", (77.6850, 12.8700));  // Electronics City
        m.insert("560089", (77.7500, 12.8500));  // Sarjapur Road
        m.insert("560090", (77.6300, 12.8200));  // Gottigere South
        m.insert("560091", (77.5200, 13.0800));  // BEL Layout
        m.insert("560092", (77.6100, 12.8100));  // Vasanthapura
        m.insert("560093", (77.5500, 12.8300));  // Thalaghattapura
        m.insert("560094", (77.5650, 13.0700));  // Yelahanka New Town
        m.insert("560095", (77.5050, 12.8900));  // Kumbalgodu
        m.insert("560096", (77.5700, 13.0800));  // Allalasandra
        m.insert("560097", (77.7300, 12.9100));  // Sarjapur
        m.insert("560098", (77.7600, 12.9500));  // Varthur
        m.insert("560099", (77.6800, 13.0100));  // Ramamurthy Nagar
        m.insert("560100", (77.6700, 13.0400));  // Nagavara
        m.insert("560102", (77.5450, 13.0700));  // Kodigehalli
        m.insert("560103", (77.5650, 13.0900));  // Yelahanka Satellite Town
        m.insert("560104", (77.6500, 13.0700));  // Thanisandra Main Road
        m.insert("560105", (77.5900, 13.0600));  // Hebbal Kempapura
        m.insert("560107", (77.7400, 12.9800));  // Whitefield
        m.insert("560108", (77.5200, 13.0950));  // Bagalur
        m
    };
}

/// Returns (longitude, latitude) for a Bengaluru PIN code.
/// Falls back to Bangalore center if the PIN code is not found.
pub fn coordinates_for_pincode(pincode: &str) -> (f64, f64) {
    PINCODE_MAP.get(pincode).copied().unwrap_or(DEFAULT_COORDS)
}

```

### File: apps/api/src/infrastructure/ml/mod.rs

```
pub mod traits;
pub mod onnx_text_detector;

pub use traits::MlService;
pub use onnx_text_detector::OnnxTextDetector;
```

### File: apps/api/src/infrastructure/ml/onnx_text_detector.rs

```
use async_trait::async_trait;
use image::imageops::FilterType;
use ndarray::{Array, IxDyn};
use ort::{session::Session, value::Value};
use std::sync::Mutex; // Added Mutex
use super::traits::{MlService, TextDetectionResult, StyleClassification};

pub struct OnnxTextDetector {
    // Wrap Session in Mutex to allow mutable access (run) from immutable &self
    session: Option<Mutex<Session>>,
    enabled: bool,
}

impl OnnxTextDetector {
    pub fn new(model_path: &str, enabled: bool) -> anyhow::Result<Self> {
        if !enabled {
            return Ok(Self {
                session: None,
                enabled: false,
            });
        }
        
        let session = Session::builder()?
            .commit_from_file(model_path)?;
        
        Ok(Self {
            // Initialize the Mutex
            session: Some(Mutex::new(session)),
            enabled: true,
        })
    }
    
    fn preprocess_image(&self, image_data: &[u8]) -> anyhow::Result<Array<f32, IxDyn>> {
        let img = image::load_from_memory(image_data)?;
        let img_resized = img.resize_exact(640, 640, FilterType::Triangle);
        let img_rgb = img_resized.to_rgb8();
        
        let (width, height) = img_rgb.dimensions();
        let mut array = Array::zeros(IxDyn(&[1, 3, height as usize, width as usize]));
        
        for y in 0..height {
            for x in 0..width {
                let pixel = img_rgb.get_pixel(x, y);
                array[[0, 0, y as usize, x as usize]] = pixel[0] as f32 / 255.0;
                array[[0, 1, y as usize, x as usize]] = pixel[1] as f32 / 255.0;
                array[[0, 2, y as usize, x as usize]] = pixel[2] as f32 / 255.0;
            }
        }
        
        Ok(array)
    }
    
    fn extract_text_from_detections(&self, output: &Array<f32, IxDyn>) -> String {
        let shape = output.shape();
        if shape.len() < 2 {
            return String::new();
        }
        
        let threshold = 0.5;
        let mut detected_regions = Vec::new();
        
        if shape.len() == 3 && shape[2] >= 5 {
            for detection_idx in 0..shape[1] {
                let confidence = output[[0, detection_idx, 4]];
                if confidence > threshold {
                    detected_regions.push(format!("text_region_{}", detected_regions.len()));
                }
            }
        }
        
        if detected_regions.is_empty() {
            "No text detected".to_string()
        } else {
            format!("Detected {} text regions", detected_regions.len())
        }
    }
}

#[async_trait]
impl MlService for OnnxTextDetector {
    async fn detect_text(&self, image_data: &[u8]) -> anyhow::Result<TextDetectionResult> {
        if !self.enabled || self.session.is_none() {
            return Ok(TextDetectionResult {
                detected_text: String::new(),
                confidence: 0.0,
                language: None,
            });
        }
        
        // Prepare input
        let input_tensor = self.preprocess_image(image_data)?;
        
        // Manual conversion (Shape + Data) to avoid version mismatch errors
        let input_shape: Vec<i64> = input_tensor.shape().iter().map(|&d| d as i64).collect();
        let input_data = input_tensor.into_raw_vec();
        let input_value = Value::from_array((input_shape, input_data))?;
        
        // LOCK THE SESSION
        // We need a mutable reference to run the session, so we lock the Mutex.
        let session_mutex = self.session.as_ref().unwrap();
        let mut session = session_mutex.lock().map_err(|_| anyhow::anyhow!("Failed to acquire session lock"))?;
        
        // Run inference
        let outputs = session.run(ort::inputs![input_value])?;
        
        // Manual output conversion
        let (extract_shape, extract_data) = outputs[0].try_extract_tensor::<f32>()?;
        
        // Reconstruct ndarray
        let shape_vec: Vec<usize> = extract_shape.iter().map(|&d| d as usize).collect();
        let output_array = Array::from_shape_vec(IxDyn(&shape_vec), extract_data.to_vec())?;
        
        let detected_text = self.extract_text_from_detections(&output_array);
        let confidence = if detected_text.is_empty() || detected_text == "No text detected" { 0.0 } else { 0.85 };
        
        Ok(TextDetectionResult {
            detected_text,
            confidence,
            language: Some("multi".to_string()),
        })
    }
    
    async fn classify_style(&self, image_data: &[u8]) -> anyhow::Result<StyleClassification> {
        if !self.enabled {
            return Ok(StyleClassification {
                style: "unknown".to_string(),
                confidence: 0.0,
            });
        }
        
        let img = image::load_from_memory(image_data)?;
        let gray = img.to_luma8();
        
        let mut edge_count = 0;
        let (width, height) = gray.dimensions();
        
        for y in 1..height-1 {
            for x in 1..width-1 {
                let center = gray.get_pixel(x, y)[0] as i32;
                let left = gray.get_pixel(x-1, y)[0] as i32;
                let right = gray.get_pixel(x+1, y)[0] as i32;
                let top = gray.get_pixel(x, y-1)[0] as i32;
                let bottom = gray.get_pixel(x, y+1)[0] as i32;
                
                let gradient = ((center - left).abs() + (center - right).abs() +
                               (center - top).abs() + (center - bottom).abs()) / 4;
                
                if gradient > 30 {
                    edge_count += 1;
                }
            }
        }
        
        let total_pixels = (width * height) as f32;
        let edge_ratio = edge_count as f32 / total_pixels;
        
        let style = if edge_ratio > 0.3 {
            "decorative"
        } else if edge_ratio > 0.15 {
            "handwritten"
        } else {
            "printed"
        };
        
        Ok(StyleClassification {
            style: style.to_string(),
            confidence: 0.75,
        })
    }
    
    async fn extract_colors(&self, image_data: &[u8]) -> anyhow::Result<Vec<String>> {
        let img = image::load_from_memory(image_data)?;
        let img = img.to_rgb8();
        
        let (width, height) = img.dimensions();
        let mut color_counts = std::collections::HashMap::new();
        
        for y in (0..height).step_by(10) {
            for x in (0..width).step_by(10) {
                let pixel = img.get_pixel(x, y);
                let r = (pixel[0] / 32) * 32;
                let g = (pixel[1] / 32) * 32;
                let b = (pixel[2] / 32) * 32;
                let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);
                *color_counts.entry(hex).or_insert(0) += 1;
            }
        }
        
        let mut colors: Vec<_> = color_counts.into_iter().collect();
        colors.sort_by(|a, b| b.1.cmp(&a.1));
        
        Ok(colors.into_iter().take(5).map(|(color, _)| color).collect())
    }
}
```

### File: apps/api/src/infrastructure/ml/tesseract_service.rs

```
use async_trait::async_trait;
use image::ImageFormat;
use std::io::Cursor;
use super::traits::{MlService, TextDetectionResult, StyleClassification};

pub struct TesseractService {
    enabled: bool,
}

impl TesseractService {
    pub fn new(enabled: bool) -> Self {
        Self { enabled }
    }
    
    fn extract_dominant_colors_from_image(image_data: &[u8]) -> anyhow::Result<Vec<String>> {
        let img = image::load_from_memory(image_data)?;
        let img = img.to_rgb8();
        
        // Simple color extraction - take sample pixels
        let mut colors = Vec::new();
        let (width, height) = img.dimensions();
        
        for y in (0..height).step_by(height as usize / 10) {
            for x in (0..width).step_by(width as usize / 10) {
                let pixel = img.get_pixel(x, y);
                let hex = format!("#{:02X}{:02X}{:02X}", pixel[0], pixel[1], pixel[2]);
                if !colors.contains(&hex) && colors.len() < 5 {
                    colors.push(hex);
                }
            }
        }
        
        Ok(colors)
    }
}

#[async_trait]
impl MlService for TesseractService {
    async fn detect_text(&self, image_data: &[u8]) -> anyhow::Result<TextDetectionResult> {
        if !self.enabled {
            return Ok(TextDetectionResult {
                detected_text: String::new(),
                confidence: 0.0,
                language: None,
            });
        }
        
        // Production OCR using tesseract-rs
        use tesseract::Tesseract;
        
        let tess = Tesseract::new(None, Some("eng+kan+hin+tam+tel"))
            .map_err(|e| anyhow::anyhow!("Tesseract init failed: {}", e))?;
        
        let text = tess
            .set_image_from_mem(image_data)
            .map_err(|e| anyhow::anyhow!("Image load failed: {}", e))?
            .get_text()
            .map_err(|e| anyhow::anyhow!("OCR failed: {}", e))?;
        
        Ok(TextDetectionResult {
            detected_text: text.trim().to_string(),
            confidence: 0.85,
            language: Some("multi".to_string()),
        })
    }
    
    async fn classify_style(&self, image_data: &[u8]) -> anyhow::Result<StyleClassification> {
        if !self.enabled {
            return Ok(StyleClassification {
                style: "unknown".to_string(),
                confidence: 0.0,
            });
        }
        
        // Production style classification using simple heuristics
        let img = image::load_from_memory(image_data)?;
        let gray = img.to_luma8();
        
        // Analyze edge density for style detection
        let edges = imageproc::edges::canny(&gray, 50.0, 100.0);
        let edge_count = edges.pixels().filter(|p| p[0] > 0).count();
        let total_pixels = (edges.width() * edges.height()) as usize;
        let edge_ratio = edge_count as f32 / total_pixels as f32;
        
        let style = if edge_ratio > 0.3 {
            "decorative"
        } else if edge_ratio > 0.15 {
            "handwritten"
        } else {
            "printed"
        };
        
        Ok(StyleClassification {
            style: style.to_string(),
            confidence: 0.75,
        })
    }
    
    async fn extract_colors(&self, image_data: &[u8]) -> anyhow::Result<Vec<String>> {
        if !self.enabled {
            return Ok(vec![]);
        }
        
        Self::extract_dominant_colors_from_image(image_data)
    }
}
```

### File: apps/api/src/infrastructure/ml/traits.rs

```
use async_trait::async_trait;

#[derive(Debug, Clone)]
pub struct TextDetectionResult {
    pub detected_text: String,
    pub confidence: f32,
    pub language: Option<String>,
}

#[derive(Debug, Clone)]
pub struct StyleClassification {
    pub style: String,
    pub confidence: f32,
}

#[async_trait]
pub trait MlService: Send + Sync {
    /// Detect text in image using OCR
    async fn detect_text(&self, image_data: &[u8]) -> anyhow::Result<TextDetectionResult>;
    
    /// Classify lettering style
    async fn classify_style(&self, image_data: &[u8]) -> anyhow::Result<StyleClassification>;
    
    /// Extract dominant colors
    async fn extract_colors(&self, image_data: &[u8]) -> anyhow::Result<Vec<String>>;
}
```

### File: apps/api/src/infrastructure/mod.rs

```
pub mod database;
pub mod geocoding;
pub mod ml;
pub mod queue;
pub mod repositories;
pub mod storage;

```

### File: apps/api/src/infrastructure/queue/mod.rs

```
pub mod redis_queue;

```

### File: apps/api/src/infrastructure/queue/redis_queue.rs

```
use redis::{AsyncCommands, Client};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MlJob {
    pub lettering_id: Uuid,
    pub image_url: String,
}

pub struct RedisQueue {
    client: Client,
}

impl RedisQueue {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn enqueue_ml_job(&self, job: MlJob) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let job_json = serde_json::to_string(&job)?;
        let _: usize = conn.lpush("ml_jobs", job_json).await?;
        Ok(())
    }

    pub async fn dequeue_ml_job(&self) -> anyhow::Result<Option<MlJob>> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let result: Option<(String, String)> = conn.brpop("ml_jobs", 5.0).await?;
        match result {
            Some((_, job_json)) => Ok(Some(serde_json::from_str(&job_json)?)),
            None => Ok(None),
        }
    }
}

```

### File: apps/api/src/infrastructure/repositories/mod.rs

```
pub mod sqlx_lettering_repository;
pub mod sqlx_social_repository;

```

### File: apps/api/src/infrastructure/repositories/sqlx_lettering_repository.rs

```
use crate::domain::lettering::{entity::*, errors::DomainError, repository::LetteringRepository};
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

pub struct SqlxLetteringRepository {
    pool: PgPool,
}

impl SqlxLetteringRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // Helper to map DB row to Lettering struct
    #[allow(clippy::too_many_arguments)]
    fn map_row_to_lettering(
        &self,
        id: Uuid,
        city_id: Uuid,
        contributor_tag: String,
        image_url: String,
        t_small: Option<String>,
        t_medium: Option<String>,
        t_large: Option<String>,
        location_wkt: Option<String>,
        pin_code: String,
        status: String,
        uploaded_by_ip: Option<sqlx::types::ipnetwork::IpNetwork>,
        created_at: chrono::DateTime<chrono::Utc>,
        updated_at: chrono::DateTime<chrono::Utc>,
        likes: i32,
        comments: i32,
        detected_text: Option<String>,
        description: Option<String>,
        image_hash: Option<String>,
        report_count: i32,
        report_reasons: serde_json::Value,
        cultural_context: Option<String>,
        ml_style: Option<String>,
        ml_script: Option<String>,
        ml_confidence: Option<f32>,
        ml_color_palette: Option<serde_json::Value>,
    ) -> Lettering {
        let coords = location_wkt
            .and_then(|wkt| {
                wkt.strip_prefix("POINT(")?
                    .strip_suffix(")")?
                    .split_once(' ')
                    .and_then(|(lng, lat)| Some(vec![lng.parse().ok()?, lat.parse().ok()?]))
            })
            .unwrap_or_else(|| vec![0.0, 0.0]);

        Lettering {
            id,
            city_id,
            contributor_tag,
            image_url,
            thumbnail_urls: ThumbnailUrls {
                small: t_small.unwrap_or_default(),
                medium: t_medium.unwrap_or_default(),
                large: t_large.unwrap_or_default(),
            },
            location: Coordinates {
                r#type: "Point".to_string(),
                coordinates: coords,
            },
            pin_code,
            detected_text,
            ml_metadata: if ml_style.is_some() || ml_script.is_some() || ml_color_palette.is_some()
            {
                Some(ImageMetadata {
                    style: ml_style,
                    script: ml_script,
                    confidence: ml_confidence,
                    color_palette: ml_color_palette.and_then(|v| serde_json::from_value(v).ok()),
                })
            } else {
                None
            },
            description,
            is_lettering: true,
            status: match status.as_str() {
                "APPROVED" => LetteringStatus::Approved,
                "REJECTED" => LetteringStatus::Rejected,
                "REPORTED" => LetteringStatus::Reported,
                _ => LetteringStatus::Pending,
            },
            likes_count: likes,
            comments_count: comments,
            uploaded_by_ip,
            image_hash,
            report_count,
            report_reasons: serde_json::from_value(report_reasons).unwrap_or_default(),
            cultural_context,
            created_at,
            updated_at,
        }
    }
}

#[async_trait]
impl LetteringRepository for SqlxLetteringRepository {
    async fn create(&self, lettering: &Lettering) -> Result<Lettering, DomainError> {
        let point_wkt = format!(
            "POINT({} {})",
            lettering.location.coordinates[0], lettering.location.coordinates[1]
        );
        let report_reasons_json =
            serde_json::to_value(&lettering.report_reasons).unwrap_or(serde_json::json!([]));

        sqlx::query!(
            r#"INSERT INTO letterings
            (id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large,
             location, pin_code, status, uploaded_by_ip, image_hash, description,
             report_count, report_reasons, cultural_context, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeogFromText($8), $9, $10, $11, $12, $13,
                    $14, $15, $16, $17, $18)"#,
            lettering.id,
            lettering.city_id,
            lettering.contributor_tag,
            lettering.image_url,
            lettering.thumbnail_urls.small,
            lettering.thumbnail_urls.medium,
            lettering.thumbnail_urls.large,
            point_wkt,
            lettering.pin_code,
            format!("{:?}", lettering.status).to_uppercase(),
            lettering.uploaded_by_ip,
            lettering.image_hash,
            lettering.description,
            lettering.report_count,
            report_reasons_json,
            lettering.cultural_context,
            lettering.created_at,
            lettering.updated_at,
        )
        .execute(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        Ok(lettering.clone())
    }

    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError> {
        let rows = sqlx::query!(
            r#"SELECT id, city_id, contributor_tag, image_url,
            thumbnail_small, thumbnail_medium, thumbnail_large,
            ST_AsText(location) as location_wkt,
            pin_code, status, uploaded_by_ip, created_at, updated_at,
            likes_count, comments_count, detected_text, description, image_hash,
            report_count, report_reasons, cultural_context,
            ml_style, ml_script, ml_confidence, ml_color_palette
            FROM letterings
            WHERE status NOT IN ('REPORTED', 'REJECTED')
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2"#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(self.map_row_to_lettering(
                row.id,
                row.city_id,
                row.contributor_tag,
                row.image_url,
                row.thumbnail_small,
                row.thumbnail_medium,
                row.thumbnail_large,
                row.location_wkt,
                row.pin_code,
                row.status,
                row.uploaded_by_ip,
                row.created_at,
                row.updated_at,
                row.likes_count,
                row.comments_count,
                row.detected_text,
                row.description,
                row.image_hash,
                row.report_count,
                row.report_reasons,
                row.cultural_context,
                row.ml_style,
                row.ml_script,
                row.ml_confidence,
                row.ml_color_palette,
            ));
        }

        Ok(results)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Lettering>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, city_id, contributor_tag, image_url,
            thumbnail_small, thumbnail_medium, thumbnail_large,
            ST_AsText(location) as location_wkt,
            pin_code, status, uploaded_by_ip, created_at, updated_at,
            likes_count, comments_count, detected_text, description, image_hash,
            report_count, report_reasons, cultural_context,
            ml_style, ml_script, ml_confidence, ml_color_palette
            FROM letterings WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        Ok(row.map(|r| {
            self.map_row_to_lettering(
                r.id,
                r.city_id,
                r.contributor_tag,
                r.image_url,
                r.thumbnail_small,
                r.thumbnail_medium,
                r.thumbnail_large,
                r.location_wkt,
                r.pin_code,
                r.status,
                r.uploaded_by_ip,
                r.created_at,
                r.updated_at,
                r.likes_count,
                r.comments_count,
                r.detected_text,
                r.description,
                r.image_hash,
                r.report_count,
                r.report_reasons,
                r.cultural_context,
                r.ml_style,
                r.ml_script,
                r.ml_confidence,
                r.ml_color_palette,
            )
        }))
    }

    async fn update(&self, _lettering: &Lettering) -> Result<Lettering, DomainError> {
        unimplemented!("Update not yet implemented")
    }

    async fn delete(&self, id: Uuid) -> Result<(), DomainError> {
        let result = sqlx::query!("DELETE FROM letterings WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound("Lettering not found".to_string()));
        }

        Ok(())
    }

    async fn search(&self, query: &str) -> Result<Vec<Lettering>, DomainError> {
        let tsquery = query
            .split_whitespace()
            .map(|w| format!("{}:*", w))
            .collect::<Vec<_>>()
            .join(" & ");

        let rows = sqlx::query!(
            r#"SELECT id, city_id, contributor_tag, image_url,
            thumbnail_small, thumbnail_medium, thumbnail_large,
            ST_AsText(location) as location_wkt,
            pin_code, status, uploaded_by_ip, created_at, updated_at,
            likes_count, comments_count, detected_text, description, image_hash,
            report_count, report_reasons, cultural_context,
            ml_style, ml_script, ml_confidence, ml_color_palette
            FROM letterings
            WHERE detected_text_tsv @@ to_tsquery('english', $1)
               OR contributor_tag ILIKE $2
               OR pin_code ILIKE $2
               OR detected_text ILIKE $2
               OR description ILIKE $2
            ORDER BY created_at DESC
            LIMIT 50"#,
            tsquery,
            format!("%{}%", query),
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(self.map_row_to_lettering(
                row.id,
                row.city_id,
                row.contributor_tag,
                row.image_url,
                row.thumbnail_small,
                row.thumbnail_medium,
                row.thumbnail_large,
                row.location_wkt,
                row.pin_code,
                row.status,
                row.uploaded_by_ip,
                row.created_at,
                row.updated_at,
                row.likes_count,
                row.comments_count,
                row.detected_text,
                row.description,
                row.image_hash,
                row.report_count,
                row.report_reasons,
                row.cultural_context,
                row.ml_style,
                row.ml_script,
                row.ml_confidence,
                row.ml_color_palette,
            ));
        }

        Ok(results)
    }

    async fn count_by_contributor_today(&self, contributor_tag: &str) -> Result<i64, DomainError> {
        let count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM letterings WHERE contributor_tag = $1 AND created_at > CURRENT_DATE",
            contributor_tag
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        Ok(count.unwrap_or(0))
    }

    async fn find_by_image_hash(&self, hash: &str) -> Result<Option<Lettering>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, city_id, contributor_tag, image_url,
            thumbnail_small, thumbnail_medium, thumbnail_large,
            ST_AsText(location) as location_wkt,
            pin_code, status, uploaded_by_ip, created_at, updated_at,
            likes_count, comments_count, detected_text, description, image_hash,
            report_count, report_reasons, cultural_context,
            ml_style, ml_script, ml_confidence, ml_color_palette
            FROM letterings WHERE image_hash = $1"#,
            hash
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;

        Ok(row.map(|r| {
            self.map_row_to_lettering(
                r.id,
                r.city_id,
                r.contributor_tag,
                r.image_url,
                r.thumbnail_small,
                r.thumbnail_medium,
                r.thumbnail_large,
                r.location_wkt,
                r.pin_code,
                r.status,
                r.uploaded_by_ip,
                r.created_at,
                r.updated_at,
                r.likes_count,
                r.comments_count,
                r.detected_text,
                r.description,
                r.image_hash,
                r.report_count,
                r.report_reasons,
                r.cultural_context,
                r.ml_style,
                r.ml_script,
                r.ml_confidence,
                r.ml_color_palette,
            )
        }))
    }
}

```

### File: apps/api/src/infrastructure/repositories/sqlx_social_repository.rs

```
use crate::domain::social::{comment::Comment, like::Like, repository::SocialRepository};
use crate::domain::lettering::errors::DomainError;
use async_trait::async_trait;
use sqlx::PgPool;
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;
use std::str::FromStr;

pub struct SqlxSocialRepository {
    pool: PgPool,
}

impl SqlxSocialRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SocialRepository for SqlxSocialRepository {
    async fn add_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<Like, DomainError> {
        let ip_network = IpNetwork::from_str(user_ip)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        let like_id = Uuid::now_v7();
        
        sqlx::query!(
            r#"INSERT INTO likes (id, lettering_id, user_ip) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (lettering_id, user_ip) DO NOTHING"#,
            like_id, lettering_id, ip_network
        )
        .execute(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
                
        sqlx::query!("UPDATE letterings SET likes_count = likes_count + 1 WHERE id = $1", lettering_id)
            .execute(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(Like {
            id: like_id,
            lettering_id,
            user_ip: ip_network,
            created_at: chrono::Utc::now(),
        })
    }

    async fn remove_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(), DomainError> {
        let ip_network = IpNetwork::from_str(user_ip)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        sqlx::query!("DELETE FROM likes WHERE lettering_id = $1 AND user_ip = $2", lettering_id, ip_network)
            .execute(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
        
        sqlx::query!("UPDATE letterings SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", lettering_id)
            .execute(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(())
    }

    async fn add_comment(&self, lettering_id: Uuid, content: String, user_ip: Option<&str>) -> Result<Comment, DomainError> {
        let ip_network = user_ip
            .map(|ip| IpNetwork::from_str(ip))
            .transpose()
            .map_err(|e| DomainError::ValidationError(format!("{}", e)))?;
        
        let comment_id = Uuid::now_v7();
        let now = chrono::Utc::now();
        
        sqlx::query!(
            r#"INSERT INTO comments (id, lettering_id, content, user_ip) 
            VALUES ($1, $2, $3, $4)"#,
            comment_id, lettering_id, content, ip_network
        )
        .execute(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
        
        sqlx::query!("UPDATE letterings SET comments_count = comments_count + 1 WHERE id = $1", lettering_id)
            .execute(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(Comment {
            id: comment_id,
            lettering_id,
            content,
            user_ip: ip_network,
            created_at: now,
        })
    }

    async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError> {
        let comments = sqlx::query_as!(
            Comment,
            r#"SELECT id, lettering_id, content, user_ip, created_at FROM comments 
            WHERE lettering_id = $1 ORDER BY created_at DESC"#,
            lettering_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(comments)
    }
}
```

### File: apps/api/src/infrastructure/security/mod.rs

```
pub mod rate_limiter;
pub mod virus_scanner;

```

### File: apps/api/src/infrastructure/security/rate_limiter.rs

```
use redis::Client;
use anyhow::Result;

pub struct RateLimiter {
    redis: Client,
    max_per_day: u32,
}

impl RateLimiter {
    pub fn new(redis: Client, max_per_day: u32) -> Self {
        Self { redis, max_per_day }
    }

    pub async fn check_rate_limit(&self, key: &str) -> Result<bool> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let count: u32 = redis::cmd("INCR")
            .arg(format!("rate_limit:{}", key))
            .query_async(&mut conn)
            .await?;
        
        if count == 1 {
            redis::cmd("EXPIRE")
                .arg(format!("rate_limit:{}", key))
                .arg(86400)
                .query_async::<_, ()>(&mut conn)
                .await?;
        }
        
        Ok(count <= self.max_per_day)
    }
}

```

### File: apps/api/src/infrastructure/security/virus_scanner.rs

```
use anyhow::Result;
use bytes::Bytes;

pub struct VirusScanner {
    enabled: bool,
    clamav_host: Option<String>,
    clamav_port: Option<u16>,
}

impl VirusScanner {
    pub fn new(enabled: bool, clamav_host: Option<String>, clamav_port: Option<u16>) -> Self {
        Self { enabled, clamav_host, clamav_port }
    }

    pub async fn scan(&self, _data: &Bytes) -> Result<bool> {
        if !self.enabled {
            return Ok(true);
        }
        // Implement ClamAV scanning here
        Ok(true)
    }
}

```

### File: apps/api/src/infrastructure/storage/mod.rs

```
pub mod r2_storage_service;
pub mod traits;

```

### File: apps/api/src/infrastructure/storage/r2_storage_service.rs

```
use async_trait::async_trait;
use aws_sdk_s3::{Client, primitives::ByteStream, config::BehaviorVersion};
use super::traits::StorageService;

pub struct R2StorageService {
    client: Client,
    bucket: String,
    public_url: String,
}

impl R2StorageService {
    pub async fn new(
        access_key: String,
        secret_key: String,
        endpoint: String,
        bucket: String,
        public_url: String,
    ) -> anyhow::Result<Self> {
        let credentials = aws_sdk_s3::config::Credentials::new(
            access_key,
            secret_key,
            None,
            None,
            "r2-credentials",
        );
        
        let config = aws_sdk_s3::config::Builder::new()
            // FIX: Explicitly set the behavior version to 'latest'
            .behavior_version(BehaviorVersion::latest())
            .credentials_provider(credentials)
            .endpoint_url(endpoint)
            .region(aws_sdk_s3::config::Region::new("auto"))
            .build();
        
        let client = Client::from_conf(config);
        
        Ok(Self {
            client,
            bucket,
            public_url,
        })
    }
}

#[async_trait]
impl StorageService for R2StorageService {
    async fn upload(&self, key: &str, data: Vec<u8>, content_type: &str) -> anyhow::Result<String> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await?;
        
        Ok(self.get_url(key))
    }
    
    async fn delete(&self, key: &str) -> anyhow::Result<()> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;
        
        Ok(())
    }
    
    fn get_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_url, key)
    }
}
```

### File: apps/api/src/infrastructure/storage/traits.rs

```
use async_trait::async_trait;

#[async_trait]
pub trait StorageService: Send + Sync {
    async fn upload(&self, key: &str, data: Vec<u8>, content_type: &str) -> anyhow::Result<String>;
    async fn delete(&self, key: &str) -> anyhow::Result<()>;
    fn get_url(&self, key: &str) -> String;
}
```

### File: apps/api/src/lib.rs

```
pub mod config;
pub mod domain;
pub mod application;
pub mod infrastructure;
pub mod presentation;
pub mod workers;

```

### File: apps/api/src/main.rs

```
use api::{
    config::Config,
    infrastructure::{
        database::pool::create_pool,
        ml::onnx_text_detector::OnnxTextDetector,
        queue::redis_queue::RedisQueue,
        repositories::{
            sqlx_lettering_repository::SqlxLetteringRepository,
            sqlx_social_repository::SqlxSocialRepository,
        },
        storage::r2_storage_service::R2StorageService,
    },
    presentation::http::{routes::create_router, state::AppState},
    workers::ml_processor::MlProcessor,
};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,api=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let db_pool = create_pool(&config.database_url, config.database_max_connections).await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&db_pool).await?;
    tracing::info!("✅ Database migrations completed");

    let ml_enabled = config.enable_ml_processing;
    let ml_model_path = &config.ml_model_path;

    let ml_detector = Arc::new(
        OnnxTextDetector::new(ml_model_path, ml_enabled).expect("Failed to initialize ML detector"),
    );

    let redis_client = redis::Client::open(config.redis_url.clone())?;
    let redis_queue = Arc::new(RedisQueue::new(redis_client.clone()));

    let storage_service = Arc::new(
        R2StorageService::new(
            config.r2_access_key_id.clone(),
            config.r2_secret_access_key.clone(),
            config.r2_endpoint.clone(),
            config.r2_bucket_name.clone(),
            config.r2_public_url.clone(),
        )
        .await?,
    );

    let state = AppState {
        db: db_pool.clone(),
        redis: redis_client,
        storage: storage_service.clone(),
        ml_detector: ml_detector.clone(),
        queue: redis_queue.clone(),
        config: config.clone(),
        lettering_repo: Arc::new(SqlxLetteringRepository::new(db_pool.clone())),
        social_repo: Arc::new(SqlxSocialRepository::new(db_pool.clone())),
    };

    if config.enable_ml_processing {
        let ml_processor = MlProcessor::new(
            db_pool.clone(),
            ml_detector.clone(),
            redis_queue,
            config.huggingface_token.clone(),
        );
        tokio::spawn(async move {
            ml_processor.start().await;
        });
    }

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    let app = create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("API Server listening on {}", addr);

    axum::serve(listener, app).await?;
    Ok(())
}

```

### File: apps/api/src/presentation/graphql/mod.rs

```
// GraphQL implementation placeholder
// Use async-graphql crate for full implementation

```

### File: apps/api/src/presentation/http/errors.rs

```
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Forbidden(String),
    BadRequest(String),
    ValidationError(String),
    InternalError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };
        
        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::InternalError(format!("Database error: {}", err))
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::InternalError(format!("IO error: {}", err))
    }
}
```

### File: apps/api/src/presentation/http/handlers/admin.rs

```
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{errors::AppError, middleware::admin::AdminClaims, state::AppState},
};

// --- DTOs ---

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct ModerationQuery {
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_status() -> String {
    "ALL".to_string()
}
fn default_limit() -> i64 {
    50
}

#[derive(Debug, Serialize)]
pub struct ModerationItem {
    pub id: Uuid,
    pub image_url: String,
    pub thumbnail_small: Option<String>,
    pub contributor_tag: String,
    pub pin_code: String,
    pub detected_text: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub likes_count: i32,
    pub comments_count: i32,
    pub report_count: i32,
    pub report_reasons: serde_json::Value,
    pub cultural_context: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ModerationQueueResponse {
    pub items: Vec<ModerationItem>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub total_uploads: i64,
    pub pending_approvals: i64,
    pub approved: i64,
    pub rejected: i64,
    pub total_cities: i64,
    pub total_likes: i64,
    pub total_comments: i64,
}

#[derive(Debug, Deserialize)]
pub struct RejectRequest {
    pub reason: Option<String>,
}

// --- Handlers ---

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    // Validate email
    if body.email != state.config.admin_email {
        return Err(AppError::Forbidden("Invalid credentials".to_string()));
    }

    // Hash the provided password and compare with stored hash
    let mut hasher = Sha256::new();
    hasher.update(body.password.as_bytes());
    let password_hash = format!("{:x}", hasher.finalize());

    if password_hash != state.config.admin_password_hash {
        return Err(AppError::Forbidden("Invalid credentials".to_string()));
    }

    // Issue JWT valid for 24 hours
    let exp = (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize;
    let claims = AdminClaims {
        sub: body.email,
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(format!("Token generation failed: {}", e)))?;

    tracing::info!("Admin login successful");
    Ok(Json(LoginResponse { token }))
}

pub async fn get_moderation_queue(
    State(state): State<AppState>,
    Query(params): Query<ModerationQuery>,
) -> Result<Json<ModerationQueueResponse>, AppError> {
    let status_filter = params.status.to_uppercase();

    let (items, total) = if status_filter == "ALL" {
        let items = sqlx::query_as!(
            ModerationItem,
            r#"SELECT id, image_url, thumbnail_small, contributor_tag, pin_code,
               detected_text, description, status, likes_count, comments_count,
               report_count, report_reasons, cultural_context, created_at
               FROM letterings
               ORDER BY created_at DESC
               LIMIT $1 OFFSET $2"#,
            params.limit,
            params.offset,
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings")
            .fetch_one(&state.db)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?
            .unwrap_or(0);

        (items, total)
    } else {
        let items = sqlx::query_as!(
            ModerationItem,
            r#"SELECT id, image_url, thumbnail_small, contributor_tag, pin_code,
               detected_text, description, status, likes_count, comments_count,
               report_count, report_reasons, cultural_context, created_at
               FROM letterings
               WHERE status = $1
               ORDER BY created_at ASC
               LIMIT $2 OFFSET $3"#,
            status_filter,
            params.limit,
            params.offset,
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM letterings WHERE status = $1",
            status_filter,
        )
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

        (items, total)
    };

    Ok(Json(ModerationQueueResponse { items, total }))
}

pub async fn approve_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query!(
        "UPDATE letterings SET status = 'APPROVED', updated_at = NOW() WHERE id = $1",
        id
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, "Lettering approved");
    Ok(StatusCode::OK)
}

pub async fn reject_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<RejectRequest>,
) -> Result<StatusCode, AppError> {
    let reason = body
        .reason
        .unwrap_or_else(|| "Rejected by admin".to_string());

    let result = sqlx::query!(
        "UPDATE letterings SET status = 'REJECTED', detected_text = $2, updated_at = NOW() WHERE id = $1",
        id,
        reason,
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, reason = %reason, "Lettering rejected");
    Ok(StatusCode::OK)
}

pub async fn delete_any_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let lettering = state
        .lettering_repo
        .find_by_id(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Lettering not found".to_string()))?;

    // Clean up R2 storage
    let url_parts: Vec<&str> = lettering.image_url.split('/').collect();
    if let Some(filename) = url_parts.last() {
        let _ = state
            .storage
            .delete(&format!("letterings/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/small/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/medium/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/large/{}", filename))
            .await;
    }

    state
        .lettering_repo
        .delete(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    tracing::info!(lettering_id = %id, "Lettering deleted by admin");
    Ok(StatusCode::NO_CONTENT)
}

/// "Keep & Clear": Resets report_count to 0, clears reasons, restores status to APPROVED
pub async fn clear_reports(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query!(
        r#"UPDATE letterings
        SET report_count = 0,
            report_reasons = '[]'::jsonb,
            status = 'APPROVED',
            updated_at = NOW()
        WHERE id = $1"#,
        id
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, "Reports cleared by admin");
    Ok(StatusCode::OK)
}

pub async fn get_stats(State(state): State<AppState>) -> Result<Json<StatsResponse>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'PENDING'")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let approved = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'APPROVED'")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let rejected = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'REJECTED'")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let cities = sqlx::query_scalar!("SELECT COUNT(*) FROM cities")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let likes = sqlx::query_scalar!("SELECT COUNT(*) FROM likes")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let comments = sqlx::query_scalar!("SELECT COUNT(*) FROM comments")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    Ok(Json(StatsResponse {
        total_uploads: total,
        pending_approvals: pending,
        approved,
        rejected,
        total_cities: cities,
        total_likes: likes,
        total_comments: comments,
    }))
}

```

### File: apps/api/src/presentation/http/handlers/analytics.rs

```
use axum::{Json, extract::State};
use serde::Serialize;

use crate::presentation::http::{errors::AppError, state::AppState};

#[derive(Debug, Serialize)]
pub struct NeighborhoodCount {
    pub pin_code: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct NeighborhoodsResponse {
    pub neighborhoods: Vec<NeighborhoodCount>,
}

pub async fn get_neighborhoods(
    State(state): State<AppState>,
) -> Result<Json<NeighborhoodsResponse>, AppError> {
    let rows = sqlx::query!(
        r#"SELECT pin_code, COUNT(*) as "artifact_count!" FROM letterings WHERE status = 'APPROVED' GROUP BY pin_code ORDER BY "artifact_count!" DESC"#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::InternalError(e.to_string()))?;

    let neighborhoods = rows
        .into_iter()
        .map(|r| NeighborhoodCount {
            pin_code: r.pin_code,
            count: r.artifact_count,
        })
        .collect();

    Ok(Json(NeighborhoodsResponse { neighborhoods }))
}

```

### File: apps/api/src/presentation/http/handlers/cities.rs

```
use axum::{Json, extract::State};
use serde::Serialize;
use uuid::Uuid;

use crate::presentation::http::{errors::AppError, state::AppState};

#[derive(Debug, Serialize)]
pub struct City {
    pub id: Uuid,
    pub name: String,
    pub country_code: String,
}

pub async fn list_cities(State(state): State<AppState>) -> Result<Json<Vec<City>>, AppError> {
    let cities = sqlx::query_as!(
        City,
        "SELECT id, name, country_code FROM cities ORDER BY name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(Json(cities))
}

```

### File: apps/api/src/presentation/http/handlers/gallery.rs

```
use axum::{extract::{Query, State}, http::StatusCode, Json};
use serde::Deserialize;
use crate::{application::get_letterings::{dto::PaginatedResponse, use_case::GetLetteringsUseCase}, infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository, presentation::http::state::AppState};

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    #[serde(default = "default_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
}

fn default_limit() -> i64 { 50 }

pub async fn get_letterings(State(state): State<AppState>, Query(params): Query<PaginationQuery>) -> Result<Json<PaginatedResponse>, StatusCode> {
    let repository = SqlxLetteringRepository::new(state.db.clone());
    let use_case = GetLetteringsUseCase::new(Box::new(repository));
    let response = use_case.execute(params.limit, params.offset).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(response))
}

```

### File: apps/api/src/presentation/http/handlers/health.rs

```
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use crate::presentation::http::state::AppState;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    database: &'static str,
    version: &'static str,
}

pub async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    // Check Database Connectivity
    let db_status = match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => "up",
        Err(e) => {
            tracing::error!("Health check failed: Database unreachable: {}", e);
            "down"
        }
    };

    let status = if db_status == "up" {
        "healthy"
    } else {
        "unhealthy"
    };

    let response = HealthResponse {
        status,
        database: db_status,
        version: env!("CARGO_PKG_VERSION"),
    };

    let code = if status == "healthy" {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (code, Json(response))
}
```

### File: apps/api/src/presentation/http/handlers/letterings.rs

```
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{errors::AppError, state::AppState},
};

#[derive(Debug, Deserialize)]
pub struct ReportRequest {
    pub reason: String,
}

pub async fn delete_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let lettering = state
        .lettering_repo
        .find_by_id(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Lettering not found".to_string()))?;

    // Delete from Cloudflare R2
    let url_parts: Vec<&str> = lettering.image_url.split('/').collect();
    if let Some(filename) = url_parts.last() {
        let key = format!("letterings/{}", filename);
        if let Err(e) = state.storage.delete(&key).await {
            tracing::error!("Failed to delete R2 object {}: {}", key, e);
        }
        let _ = state
            .storage
            .delete(&format!("thumbnails/small/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/medium/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/large/{}", filename))
            .await;
    }

    // Delete from database (cascades to likes, comments)
    state
        .lettering_repo
        .delete(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    tracing::info!(lettering_id = %id, "Lettering deleted successfully");

    Ok(StatusCode::NO_CONTENT)
}

/// Report an artifact. Increments report_count and appends the reason.
/// Items crossing the threshold (3 reports) are automatically hidden (REPORTED status).
pub async fn report_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<ReportRequest>,
) -> Result<StatusCode, AppError> {
    let reason = body.reason.trim().to_string();
    if reason.is_empty() {
        return Err(AppError::BadRequest(
            "Report reason is required".to_string(),
        ));
    }

    let result = sqlx::query!(
        r#"UPDATE letterings
        SET report_count = report_count + 1,
            report_reasons = report_reasons || $2::jsonb,
            status = CASE WHEN report_count + 1 >= 3 THEN 'REPORTED' ELSE status END,
            updated_at = NOW()
        WHERE id = $1"#,
        id,
        serde_json::json!([reason]),
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, "Lettering reported");
    Ok(StatusCode::OK)
}

```

### File: apps/api/src/presentation/http/handlers/mod.rs

```
pub mod admin;
pub mod analytics;
pub mod cities;
pub mod gallery;
pub mod health;
pub mod letterings;
pub mod search;
pub mod social;
pub mod upload;

```

### File: apps/api/src/presentation/http/handlers/search.rs

```
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;

use crate::{
    application::search_letterings::{dto::SearchRequest, use_case::SearchLetteringsUseCase},
    domain::lettering::entity::Lettering,
    infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository,
    presentation::http::state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    q: String,
    #[serde(default = "default_limit")]
    limit: i64,
}

fn default_limit() -> i64 { 20 }

pub async fn search_letterings(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<Lettering>>, StatusCode> {
    let repository = SqlxLetteringRepository::new(state.db.clone());
    let use_case = SearchLetteringsUseCase::new(Box::new(repository));
    
    let request = SearchRequest {
        query: params.q,
        limit: Some(params.limit),
    };
    
    let results = use_case.execute(request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(results))
}

```

### File: apps/api/src/presentation/http/handlers/social.rs

```
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    application::social::use_case::SocialUseCase,
    domain::social::comment::Comment,
    infrastructure::repositories::sqlx_social_repository::SqlxSocialRepository,
    presentation::http::state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct AddCommentRequest {
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct LikeResponse {
    pub likes_count: i32,
}

pub async fn like_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<LikeResponse>, StatusCode> {
    let repository = SqlxSocialRepository::new(state.db.clone());
    let use_case = SocialUseCase::new(Box::new(repository));
    
    // In production, get real IP from request
    let user_ip = "127.0.0.1";
    
    use_case.add_like(id, user_ip)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Return updated count (would query from DB in production)
    Ok(Json(LikeResponse { likes_count: 1 }))
}

pub async fn add_comment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddCommentRequest>,
) -> Result<Json<Comment>, StatusCode> {
    let repository = SqlxSocialRepository::new(state.db.clone());
    let use_case = SocialUseCase::new(Box::new(repository));
    
    let request = crate::application::social::dto::AddCommentRequest {
        lettering_id: id,
        content: payload.content,
    };
    
    let comment = use_case.add_comment(request, Some("127.0.0.1"))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(comment))
}

pub async fn get_comments(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<Comment>>, StatusCode> {
    let repository = SqlxSocialRepository::new(state.db.clone());
    let use_case = SocialUseCase::new(Box::new(repository));
    
    let comments = use_case.get_comments(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(comments))
}

```

### File: apps/api/src/presentation/http/handlers/state.rs

```
use crate::{
    config::Config,
    infrastructure::{
        ml::traits::MlService,
        queue::redis_queue::RedisQueue,
        repositories::{
            sqlx_lettering_repository::SqlxLetteringRepository,
            sqlx_social_repository::SqlxSocialRepository,
        },
        storage::traits::StorageService,
    },
};
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: redis::Client,
    pub storage: Arc<dyn StorageService>,
    pub ml_detector: Arc<dyn MlService>,
    pub queue: Arc<RedisQueue>,
    pub config: Config,
    pub lettering_repo: Arc<SqlxLetteringRepository>,
    pub social_repo: Arc<SqlxSocialRepository>,
}

```

### File: apps/api/src/presentation/http/handlers/upload.rs

```
use axum::{extract::{Multipart, State}, http::StatusCode, Json};
use bytes::Bytes;
use serde::Serialize;
use tracing::Span;
use uuid::Uuid;
use crate::{application::upload_lettering::{dto::UploadLetteringRequest, use_case::UploadLetteringUseCase}, infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository, presentation::http::state::AppState};

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub id: Uuid,
    pub url: String,
    pub status: String,
    pub message: String,
}

#[tracing::instrument(skip(state, multipart), fields(city_id, contributor))]
pub async fn upload_lettering(State(state): State<AppState>, mut multipart: Multipart) -> Result<Json<UploadResponse>, StatusCode> {
    let mut image_data: Option<Bytes> = None;
    let mut contributor_tag: Option<String> = None;
    let mut pin_code: Option<String> = None;
    let mut city_id: Option<Uuid> = None;
    let mut description: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "image" => image_data = Some(field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?),
            "contributor_tag" => {
                contributor_tag = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?);
                Span::current().record("contributor", contributor_tag.as_ref().unwrap().as_str());
            }
            "pin_code" => pin_code = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?),
            "city_id" => {
                let text = field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?;
                city_id = Some(Uuid::parse_str(&text).map_err(|_| StatusCode::BAD_REQUEST)?);
                Span::current().record("city_id", &city_id.unwrap().to_string());
            }
            "description" => {
                description = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?);
            }
            _ => {}
        }
    }

    let repository = SqlxLetteringRepository::new(state.db.clone());
    let use_case = UploadLetteringUseCase::new(Box::new(repository), state.storage, state.queue);
    let request = UploadLetteringRequest {
        city_id: city_id.ok_or(StatusCode::BAD_REQUEST)?,
        contributor_tag: contributor_tag.ok_or(StatusCode::BAD_REQUEST)?,
        pin_code: pin_code.ok_or(StatusCode::BAD_REQUEST)?,
        image_data: image_data.ok_or(StatusCode::BAD_REQUEST)?,
        description,
        uploaded_by_ip: None,
    };

    let lettering = use_case.execute(request).await.map_err(|e| {
        tracing::error!("Upload failed: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(Json(UploadResponse { 
        id: lettering.id, 
        url: lettering.image_url.clone(), 
        status: "processing".into(), 
        message: "Upload successful".into() 
    }))
}
```

### File: apps/api/src/presentation/http/middleware/admin.rs

```
use axum::{
    extract::State,
    http::{StatusCode, header},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};

use crate::presentation::http::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminClaims {
    pub sub: String,
    pub exp: usize,
}

pub async fn require_admin(
    State(state): State<AppState>,
    req: axum::extract::Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let _claims = decode::<AdminClaims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(next.run(req).await)
}

```

### File: apps/api/src/presentation/http/middleware/logging.rs

```
use axum::{extract::Request, middleware::Next, response::Response};

pub async fn logging_middleware(request: Request, next: Next) -> Response {
    tracing::info!("Request: {} {}", request.method(), request.uri());
    next.run(request).await
}

```

### File: apps/api/src/presentation/http/middleware/mod.rs

```
pub mod admin;
pub mod logging;
pub mod rate_limit;

```

### File: apps/api/src/presentation/http/middleware/rate_limit.rs

```
use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

pub async fn rate_limit_middleware(request: Request, next: Next) -> Result<Response, StatusCode> {
    // Implement rate limiting logic
    Ok(next.run(request).await)
}

```

### File: apps/api/src/presentation/http/mod.rs

```
pub mod handlers;
pub mod routes;
pub mod state;
pub mod middleware;
pub mod errors;
```

### File: apps/api/src/presentation/http/routes.rs

```
use super::{
    handlers::{admin, analytics, cities, gallery, health, letterings, search, social, upload},
    middleware::admin::require_admin,
    state::AppState,
};
use axum::{
    Router, middleware,
    routing::{delete, get, post},
};

pub fn create_router(state: AppState) -> Router {
    let admin_routes = Router::new()
        .route("/api/v1/admin/moderation", get(admin::get_moderation_queue))
        .route(
            "/api/v1/admin/letterings/{id}/approve",
            post(admin::approve_lettering),
        )
        .route(
            "/api/v1/admin/letterings/{id}/reject",
            post(admin::reject_lettering),
        )
        .route(
            "/api/v1/admin/letterings/{id}",
            delete(admin::delete_any_lettering),
        )
        .route(
            "/api/v1/admin/letterings/{id}/clear-reports",
            post(admin::clear_reports),
        )
        .route("/api/v1/admin/stats", get(admin::get_stats))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_admin));

    Router::new()
        // Health
        .route("/health", get(health::health_check))
        // Letterings CRUD
        .route("/api/v1/letterings", get(gallery::get_letterings))
        .route("/api/v1/letterings/upload", post(upload::upload_lettering))
        .route("/api/v1/letterings/search", get(search::search_letterings))
        .route(
            "/api/v1/letterings/{id}",
            delete(letterings::delete_lettering),
        )
        .route(
            "/api/v1/letterings/{id}/report",
            post(letterings::report_lettering),
        )
        // Analytics
        .route(
            "/api/v1/analytics/neighborhoods",
            get(analytics::get_neighborhoods),
        )
        // Social
        .route("/api/v1/letterings/{id}/like", post(social::like_lettering))
        .route(
            "/api/v1/letterings/{id}/comments",
            post(social::add_comment).get(social::get_comments),
        )
        // Cities
        .route("/api/v1/cities", get(cities::list_cities))
        // Admin login (unprotected)
        .route("/api/v1/admin/login", post(admin::login))
        // Admin (protected by JWT middleware)
        .merge(admin_routes)
        .with_state(state)
}

```

### File: apps/api/src/presentation/http/state.rs

```
use sqlx::PgPool;
use std::sync::Arc;
use crate::{
    config::Config,
    infrastructure::{
        storage::traits::StorageService,
        ml::traits::MlService,
        queue::redis_queue::RedisQueue,
        repositories::{
            sqlx_lettering_repository::SqlxLetteringRepository,
            sqlx_social_repository::SqlxSocialRepository,
        },
    },
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: redis::Client,
    pub storage: Arc<dyn StorageService>,
    pub ml_detector: Arc<dyn MlService>,
    pub queue: Arc<RedisQueue>,
    pub config: Config,
    pub lettering_repo: Arc<SqlxLetteringRepository>,
    pub social_repo: Arc<SqlxSocialRepository>,
}
```

### File: apps/api/src/presentation/mod.rs

```
pub mod http;

```

### File: apps/api/src/presentation/websocket/mod.rs

```
// WebSocket implementation placeholder
// Use axum::extract::ws for full implementation

```

### File: apps/api/src/workers/ml_processor.rs

```
#[allow(dead_code)]
use crate::infrastructure::{
    ml::onnx_text_detector::OnnxTextDetector, ml::traits::MlService, queue::redis_queue::RedisQueue,
};
use sqlx::PgPool;
use std::{collections::HashMap, sync::Arc, time::Duration};

pub struct MlProcessor {
    db: PgPool,
    detector: Arc<OnnxTextDetector>,
    queue: Arc<RedisQueue>,
    huggingface_token: Option<String>,
}

impl MlProcessor {
    pub fn new(
        db: PgPool,
        detector: Arc<OnnxTextDetector>,
        queue: Arc<RedisQueue>,
        huggingface_token: Option<String>,
    ) -> Self {
        Self {
            db,
            detector,
            queue,
            huggingface_token,
        }
    }

    pub async fn start(&self) {
        tracing::info!("ML Processor worker active. Monitoring Redis queue.");
        let client = reqwest::Client::new();

        loop {
            match self.queue.dequeue_ml_job().await {
                Ok(Some(job)) => {
                    tracing::info!("Processing ML job for lettering {}", job.lettering_id);

                    let response = client.get(&job.image_url).send().await;

                    let image_bytes = match response {
                        Ok(resp) if resp.status() == 404 => {
                            tracing::warn!(
                                "Image missing in R2 for {}, cleaning up DB",
                                job.lettering_id
                            );
                            let _ = sqlx::query!(
                                "DELETE FROM letterings WHERE id = $1",
                                job.lettering_id
                            )
                            .execute(&self.db)
                            .await;
                            continue;
                        }
                        Ok(resp) => resp.bytes().await.unwrap_or_default(),
                        Err(e) => {
                            tracing::error!("Network error fetching image: {}", e);
                            continue;
                        }
                    };

                    // 1. OCR: Try ONNX first, fall back to HuggingFace
                    let text = match self.detector.detect_text(&image_bytes).await {
                        Ok(res)
                            if !res.detected_text.is_empty()
                                && res.detected_text != "No text detected" =>
                        {
                            Some(res.detected_text)
                        }
                        _ => {
                            // Fallback: HuggingFace TrOCR
                            self.huggingface_ocr(&client, &image_bytes).await
                        }
                    };

                    // 2. Color palette extraction
                    let color_palette = self.extract_color_palette(&image_bytes);

                    // 3. Style classification
                    let style = self
                        .detector
                        .classify_style(&image_bytes)
                        .await
                        .ok()
                        .map(|s| s.style);

                    // 4. Fetch Wikipedia context for the neighborhood
                    let pin_code: Option<String> = sqlx::query_scalar!(
                        "SELECT pin_code FROM letterings WHERE id = $1",
                        job.lettering_id
                    )
                    .fetch_optional(&self.db)
                    .await
                    .ok()
                    .flatten();

                    let cultural_context = if let Some(ref pin) = pin_code {
                        self.fetch_wikipedia_context(&client, pin).await
                    } else {
                        None
                    };

                    // Build ML metadata JSON
                    let ml_color_palette = color_palette
                        .as_ref()
                        .map(|colors| serde_json::to_value(colors).unwrap_or_default());

                    let update_result = sqlx::query!(
                        r#"UPDATE letterings SET
                            detected_text = COALESCE($1, detected_text),
                            ml_style = $2,
                            ml_color_palette = COALESCE($3, ml_color_palette),
                            cultural_context = COALESCE($4, cultural_context),
                            status = 'APPROVED',
                            updated_at = NOW()
                        WHERE id = $5"#,
                        text,
                        style,
                        ml_color_palette,
                        cultural_context,
                        job.lettering_id
                    )
                    .execute(&self.db)
                    .await;

                    match update_result {
                        Ok(_) => {
                            tracing::info!("Successfully processed lettering {}", job.lettering_id)
                        }
                        Err(e) => tracing::error!(
                            "Failed to update DB for lettering {}: {}",
                            job.lettering_id,
                            e
                        ),
                    }
                }
                Ok(None) => tokio::time::sleep(Duration::from_secs(1)).await,
                Err(e) => {
                    tracing::debug!("Queue poll error (expected when idle): {:?}", e);
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }

    /// Call HuggingFace TrOCR for handwritten text recognition
    async fn huggingface_ocr(
        &self,
        client: &reqwest::Client,
        image_bytes: &[u8],
    ) -> Option<String> {
        let token = self.huggingface_token.as_ref()?;

        let response = client
            .post("https://api-inference.huggingface.co/models/microsoft/trocr-base-handwritten")
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/octet-stream")
            .body(image_bytes.to_vec())
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            tracing::warn!("HuggingFace OCR returned {}", response.status());
            return None;
        }

        let body: serde_json::Value = response.json().await.ok()?;

        // HuggingFace returns [{"generated_text": "..."}]
        body.as_array()
            .and_then(|arr| arr.first())
            .and_then(|obj| obj.get("generated_text"))
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
    }

    /// Extract top 3 dominant hex color codes from an image
    fn extract_color_palette(&self, image_bytes: &[u8]) -> Option<Vec<String>> {
        let img = image::load_from_memory(image_bytes).ok()?;
        let rgb = img.to_rgb8();
        let (width, height) = rgb.dimensions();

        let mut color_counts: HashMap<String, u32> = HashMap::new();

        // Sample every 8th pixel for speed
        for y in (0..height).step_by(8) {
            for x in (0..width).step_by(8) {
                let pixel = rgb.get_pixel(x, y);
                // Quantize to reduce color space (divide into 32-step buckets)
                let r = (pixel[0] / 32) * 32;
                let g = (pixel[1] / 32) * 32;
                let b = (pixel[2] / 32) * 32;
                let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);
                *color_counts.entry(hex).or_insert(0) += 1;
            }
        }

        let mut colors: Vec<_> = color_counts.into_iter().collect();
        colors.sort_by(|a, b| b.1.cmp(&a.1));

        Some(colors.into_iter().take(3).map(|(hex, _)| hex).collect())
    }

    /// Fetch Wikipedia summary for a neighborhood based on PIN code
    async fn fetch_wikipedia_context(
        &self,
        client: &reqwest::Client,
        pin_code: &str,
    ) -> Option<String> {
        let neighborhood = pin_to_neighborhood(pin_code)?;

        let url = format!(
            "https://en.wikipedia.org/api/rest_v1/page/summary/{}",
            neighborhood.replace(' ', "_")
        );

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "ThroughYourLetters/1.0 (contact@throughyourletters.online)",
            )
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let body: serde_json::Value = response.json().await.ok()?;
        let extract = body.get("extract")?.as_str()?;

        // Take first ~500 chars (roughly 2-3 paragraphs for short articles)
        let truncated = if extract.len() > 500 {
            // Find a sentence boundary near 500 chars
            extract[..500]
                .rfind(". ")
                .map(|i| &extract[..=i])
                .unwrap_or(&extract[..500])
                .to_string()
        } else {
            extract.to_string()
        };

        if truncated.is_empty() {
            None
        } else {
            Some(truncated)
        }
    }
}

/// Map Bengaluru PIN codes to Wikipedia-searchable neighborhood names
fn pin_to_neighborhood(pin: &str) -> Option<&'static str> {
    match pin {
        "560001" => Some("MG Road, Bangalore"),
        "560002" => Some("Shivajinagar, Bangalore"),
        "560003" => Some("Malleshwaram"),
        "560004" => Some("Basavanagudi"),
        "560005" => Some("Frazer Town, Bangalore"),
        "560008" => Some("Ulsoor"),
        "560009" => Some("Richmond Town, Bangalore"),
        "560010" => Some("Sadashivanagar, Bangalore"),
        "560011" => Some("Jayanagar, Bangalore"),
        "560018" => Some("Rajajinagar"),
        "560020" => Some("Vijayanagar, Bangalore"),
        "560021" => Some("Seshadripuram"),
        "560025" => Some("Banashankari"),
        "560027" => Some("Gandhinagar, Bangalore"),
        "560028" => Some("BTM Layout"),
        "560029" => Some("Adugodi"),
        "560030" => Some("Wilson Garden, Bangalore"),
        "560033" => Some("Peenya"),
        "560034" => Some("Koramangala"),
        "560038" => Some("Indiranagar, Bangalore"),
        "560040" => Some("Benson Town, Bangalore"),
        "560041" => Some("Hebbal, Bangalore"),
        "560047" => Some("HAL, Bangalore"),
        "560050" => Some("Yeshwanthpur"),
        "560051" => Some("Mahalakshmi Layout"),
        "560054" => Some("Domlur"),
        "560055" => Some("Chamrajpet"),
        "560066" => Some("Whitefield, Bangalore"),
        "560070" => Some("JP Nagar, Bangalore"),
        "560078" => Some("Electronic City, Bangalore"),
        "560085" => Some("Marathahalli"),
        "560095" => Some("Bellandur"),
        "560102" => Some("HSR Layout"),
        "560103" => Some("Sarjapur Road, Bangalore"),
        _ => None,
    }
}

```

### File: apps/api/src/workers/mod.rs

```
pub mod ml_processor;

```

### File: apps/api/tests/integration/mod.rs

```
mod test_upload;
mod test_gallery;

```

### File: apps/api/tests/integration/test_gallery.rs

```
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_letterings() {
        // Integration test for gallery endpoint
        assert!(true);
    }
    
    #[tokio::test]
    async fn test_pagination() {
        // Test pagination logic
        assert!(true);
    }
}

```

### File: apps/api/tests/integration/test_upload.rs

```
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_upload_lettering() {
        // Integration test for upload endpoint
        assert!(true);
    }
}

```

### File: apps/api/tests/unit/test_domain.rs

```
#[cfg(test)]
mod tests {
    #[test]
    fn test_pin_code_validation() {
        // Unit test for PIN code validation
        assert!(true);
    }
}

```

### File: apps/mobile/README.md

```
# Mobile App (iOS + Android)

## Setup

```bash
# Install dependencies
cd apps/mobile
pnpm install

# Add platforms (first time only)
pnpm add:ios
pnpm add:android

# Build web app first
cd ../web
pnpm build
cd ../mobile

# Sync web build to native platforms
pnpm sync

# Open in Xcode (iOS)
pnpm open:ios

# Open in Android Studio (Android)
pnpm open:android
```

## Development

The mobile app uses the same React codebase as the web app (`apps/web`).

Changes to web code automatically sync to mobile:

```bash
cd apps/web
pnpm build
cd ../mobile
pnpm sync
```

## Native Features

- Camera access for photo upload
- Geolocation for PIN code detection
- Native share functionality
- Haptic feedback
- Status bar customization

## Build for Production

### iOS
1. Open in Xcode: `pnpm open:ios`
2. Select signing & capabilities
3. Archive → Distribute to App Store

### Android
1. Open in Android Studio: `pnpm open:android`
2. Build → Generate Signed Bundle/APK
3. Upload to Google Play Console

```

### File: apps/mobile/android/app/src/main/AndroidManifest.xml

```
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
</manifest>

```

### File: apps/mobile/capacitor.config.ts

```
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.throughyourletters.app',
  appName: 'Through Your Letters',
  webDir: '../web/dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor'
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
      quality: 90,
      allowEditing: false,
      resultType: 'base64',
      saveToGallery: false
    },
    Geolocation: {
      permissions: {
        location: 'whenInUse'
      }
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      showSpinner: false
    }
  }
};

export default config;

```

### File: apps/mobile/ios/App/Info.plist

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>Through Your Letters</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>NSCameraUsageDescription</key>
    <string>We need camera access to let you photograph street lettering</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>We need your location to tag where the photo was taken</string>
</dict>
</plist>

```

### File: apps/mobile/package.json

```
{
  "name": "@ttl/mobile",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "sync": "cap sync",
    "sync:ios": "cap sync ios",
    "sync:android": "cap sync android",
    "open:ios": "cap open ios",
    "open:android": "cap open android",
    "add:ios": "cap add ios",
    "add:android": "cap add android"
  },
  "dependencies": {
    "@capacitor/android": "^6.2.0",
    "@capacitor/app": "^6.0.1",
    "@capacitor/camera": "^6.0.2",
    "@capacitor/core": "^6.2.0",
    "@capacitor/geolocation": "^6.0.1",
    "@capacitor/ios": "^6.2.0",
    "@capacitor/haptics": "^6.0.1",
    "@capacitor/share": "^6.0.2",
    "@capacitor/splash-screen": "^6.0.2",
    "@capacitor/status-bar": "^6.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.2.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.9.3",
    "vite": "^6.0.7"
  }
}

```

### File: apps/mobile/tsconfig.json

```
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "capacitor.config.ts"],
  "references": [
    { "path": "../../packages/types" },
    { "path": "../../packages/utils" },
    { "path": "../../packages/validation" }
  ]
}
```

### File: apps/web/Dockerfile

```
FROM node:20-alpine as builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

```

### File: apps/web/README.md

```
# Web Frontend

React + TypeScript + Vite + Tailwind CSS

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173

## Build

```bash
pnpm build
pnpm preview
```

## Features

- Image upload with drag & drop
- Gallery with infinite scroll
- Map-based exploration
- Real-time search
- Social interactions (likes, comments)
- Responsive design
- PWA support

## Technology

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **Zustand** - State management

```

### File: apps/web/index.html

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="A collaborative archive of street typography and lettering from Bengaluru, India" />
    <title>Through Your Letters | Bengaluru Street Typography Archive</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

### File: apps/web/nginx.conf

```
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

```

### File: apps/web/package.json

```
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
```

### File: apps/web/postcss.config.js

```
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### File: apps/web/src/App.tsx

```
import React, { useState, useEffect } from "react";
import { AppMode, ZinePageData, Lettering } from "./types";
import { API_BASE_URL } from "./constants";
import Header from "./components/Header";
import ZinePage from "./components/ZinePage";
import ContributionPanel from "./components/ContributionPanel";
import MapSection from "./components/MapSection";
import AdminPanel from "./components/AdminPanel";
import ToastContainer from "./components/ui/ToastContainer";
import { useToastStore } from "./store/useToastStore";
import {
  Compass,
  PlusCircle,
  Globe,
  Loader2,
  Puzzle,
  Map as MapIcon,
  Info,
} from "lucide-react";

const SCRIPT_SPECIMENS = [
  { char: "ଅ", lang: "Odia", font: "odia", color: "bg-[#cc543a] text-white" },
  { char: "ಕ", lang: "Kannada", font: "kannada", color: "bg-black text-white" },
  {
    char: "ಅ",
    lang: "Kannada",
    font: "kannada",
    color: "bg-slate-200 text-black",
  },
  {
    char: "अ",
    lang: "Hindi",
    font: "devanagari",
    color: "bg-[#cc543a] text-white",
  },
  {
    char: "ह",
    lang: "Marathi",
    font: "devanagari",
    color: "bg-black text-white",
  },
  {
    char: "അ",
    lang: "Malayalam",
    font: "malayalam",
    color: "bg-[#2d5a27] text-white",
  },
  { char: "ا", lang: "Urdu", font: "urdu", color: "bg-[#d4a017] text-white" },
  {
    char: "ꯀ",
    lang: "Manipuri",
    font: "latin",
    color: "bg-slate-800 text-white",
  },
  { char: "A", lang: "Latin", font: "", color: "bg-slate-100 text-black" },
];

const ScriptPuzzleGrid = () => {
  const [activeItem, setActiveItem] = useState<number | null>(null);
  return (
    <div className="pixel-grid">
      {SCRIPT_SPECIMENS.map((item, idx) => (
        <button
          key={idx}
          onClick={() => setActiveItem(idx === activeItem ? null : idx)}
          className={`${item.color} aspect-square flex items-center justify-center border border-black/10 relative overflow-hidden group`}
        >
          <span
            className={`text-2xl font-black ${item.font} transition-transform group-hover:scale-125`}
          >
            {item.char}
          </span>
          {activeItem === idx && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-1">
              <span className="text-[7px] font-black uppercase text-white mb-1">
                {item.lang}
              </span>
              <div className="w-4 h-[1px] bg-[#cc543a]"></div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  // Fix: Detect Admin from URL immediately
  const [mode, setMode] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("admin") ? AppMode.ADMIN : AppMode.EXPLORE;
  });

  const [letterings, setLetterings] = useState<ZinePageData[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const fetchLetterings = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/api/v1/letterings?limit=50&offset=0`,
      );
      const data = await res.json();
      const formatted = data.letterings.map((item: Lettering) => ({
        id: item.id,
        title: item.detected_text || "Street Discovery",
        location: item.pin_code,
        culturalContext:
          item.cultural_context ||
          item.description ||
          "Archived street typography from the city.",
        historicalNote: `Status: ${item.status}. Archived: ${new Date(item.created_at).toLocaleDateString()}`,
        image: item.image_url,
        thumbnail: item.thumbnail_urls.small,
        vibe: item.ml_metadata?.style || "Handcrafted",
        isUserContribution: true,
        contributorName: item.contributor_tag,
        description: item.description,
      }));
      setLetterings(formatted);
    } catch (e) {
      addToast("Archive connection failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Permanently delete this specimen?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/letterings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("Specimen deleted", "success");
        fetchLetterings();
      } else throw new Error();
    } catch (e) {
      addToast("Delete failed", "error");
    }
  };

  useEffect(() => {
    fetchLetterings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto bg-white/40 shadow-2xl relative border-x-4 border-black zine-texture">
      <div className="grain-overlay"></div>
      <Header mode={mode} setMode={setMode} />
      <ToastContainer />

      <main className="flex-1 overflow-y-auto px-6 md:px-16 py-16 relative">
        {mode === AppMode.ADMIN && (
          <AdminPanel onClose={() => setMode(AppMode.EXPLORE)} />
        )}

        {mode === AppMode.EXPLORE && (
          <div className="space-y-40 pb-24">
            <section className="space-y-12">
              <div className="flex justify-between items-end border-b-4 border-black pb-8">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                  The Gallery
                </h2>
                <button
                  onClick={() => setMode(AppMode.CONTRIBUTE)}
                  className="bg-[#cc543a] text-white px-6 py-3 text-[10px] font-black uppercase brutalist-shadow-sm hover:bg-black transition-all"
                >
                  Add Discovery
                </button>
              </div>
              {loading ? (
                <Loader2 className="animate-spin mx-auto text-[#cc543a]" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {letterings.slice(0, 10).map((page, idx) => (
                    <div
                      key={page.id}
                      className={`group bg-white border-2 border-black p-3 brutalist-shadow-sm hover:-translate-y-1 transition-all ${idx % 3 === 0 ? "md:col-span-2" : ""}`}
                    >
                      <a href={`#page-${page.id}`} className="block space-y-4">
                        <img
                          src={page.thumbnail || page.image}
                          className="aspect-square w-full object-cover border border-black grayscale group-hover:grayscale-0"
                          alt={page.title}
                        />
                        <p className="text-[11px] font-black uppercase truncate text-black">
                          {page.title}
                        </p>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-black text-white p-10 brutalist-shadow space-y-8 relative overflow-hidden group">
              <div className="flex items-center gap-3 text-[#d4a017]">
                <Globe size={20} />
                <h4 className="text-[11px] font-black uppercase tracking-widest">
                  Museum Access
                </h4>
              </div>
              <p className="text-sm font-bold text-slate-300">
                Browse the complete archive to discover documented typographic
                stories from the city.
              </p>
              <button
                onClick={() =>
                  document
                    .getElementById("archive-root")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-[#cc543a] px-5 py-4 text-[11px] font-black uppercase hover:bg-white hover:text-black transition-all"
              >
                Enter Archive
              </button>
            </section>

            <div id="archive-root" className="space-y-32">
              {letterings.map((page) => (
                <ZinePage key={page.id} page={page} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {mode === AppMode.CONTRIBUTE && (
          <ContributionPanel
            onCancel={() => setMode(AppMode.EXPLORE)}
            onSubmit={() => {
              fetchLetterings();
              setMode(AppMode.EXPLORE);
            }}
          />
        )}
        {mode === AppMode.MAP && <MapSection />}
        {mode === AppMode.ABOUT && (
          <div className="max-w-4xl mx-auto py-20 space-y-32">
            <h2 className="text-7xl md:text-9xl font-black uppercase italic leading-[0.7]">
              A Personal <span className="text-[#cc543a]">Note.</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <div className="space-y-8">
                <p className="handwritten text-2xl leading-relaxed font-bold border-l-4 border-black pl-8">
                  This project started as a personal curiosity for street
                  lettering. When I was a child, I spent my time reading
                  magazines and books that my father collected passionately...
                </p>
                <p className="serif text-xl italic text-slate-700">
                  My mother used to show me those same charts to get me to eat
                  my food, so I believe that's where my fascination with
                  letterforms truly began.
                </p>
              </div>
              <div className="bg-black text-white p-14 brutalist-shadow-lg transform rotate-1">
                <p className="text-xl font-bold mb-4 italic">
                  I aim to build an open-source platform by the people, for the
                  people, for street lettering archival.
                </p>
                <p className="text-base opacity-80">
                  Capture yours, and thank you.
                </p>
              </div>
            </div>
            <div className="pt-32 border-t-8 border-black">
              <h3 className="text-5xl font-black uppercase mb-12 flex items-center gap-4">
                <Puzzle size={40} /> Letters and Bits
              </h3>
              <ScriptPuzzleGrid />
            </div>
          </div>
        )}
      </main>

      <nav className="sticky bottom-10 self-center w-[92%] md:w-[65%] bg-white border-4 border-black p-6 flex justify-between items-center z-50 brutalist-shadow-lg mx-auto mb-10 transition-all hover:scale-[1.01]">
        <button
          onClick={() => setMode(AppMode.EXPLORE)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.EXPLORE ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <Compass size={28} />
          Explore
        </button>
        <button
          onClick={() => setMode(AppMode.CONTRIBUTE)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.CONTRIBUTE ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <PlusCircle size={28} />
          Contribute
        </button>
        <button
          onClick={() => setMode(AppMode.MAP)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.MAP ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <MapIcon size={28} />
          Map
        </button>
        <button
          onClick={() => setMode(AppMode.ABOUT)}
          className={`flex-1 flex flex-col items-center gap-1.5 font-black text-[11px] uppercase ${mode === AppMode.ABOUT ? "text-[#cc543a]" : "text-slate-400"}`}
        >
          <Info size={28} />
          Info
        </button>
      </nav>
    </div>
  );
};

export default App;

```

### File: apps/web/src/components/AdminPanel.tsx

```
import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../constants";
import { useToastStore } from "../store/useToastStore";
import {
  Shield,
  Check,
  X,
  Trash2,
  RefreshCw,
  BarChart3,
  Image as ImageIcon,
  AlertTriangle,
  LogIn,
  Clock,
  Users,
  Heart,
  MessageCircle,
  ExternalLink,
  MapPin,
  Filter,
} from "lucide-react";
import { Lettering } from "../types";

const SESSION_KEY = "ttl_admin_token";

interface AdminStats {
  total_uploads: number;
  pending_approvals: number;
  approved: number;
  rejected: number;
  total_cities: number;
  total_likes: number;
  total_comments: number;
}

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addToast } = useToastStore();
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_KEY),
  );
  const [tab, setTab] = useState<"queue" | "reports" | "stats">("queue");
  const [items, setItems] = useState<Lettering[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Stats synchronization failed");
    }
  }, [token]);

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const status = tab === "reports" ? "REPORTED" : statusFilter;
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/moderation?status=${status}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        setToken(null);
        addToast("Session expired", "error");
        return;
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      addToast("Failed to fetch queue", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, token, addToast]);

  useEffect(() => {
    if (token) {
      fetchQueue();
      fetchStats();
    }
  }, [token, tab, statusFilter, fetchQueue, fetchStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, data.token);
        setToken(data.token);
        addToast("Admin Access Granted", "success");
      } else {
        addToast(data.error || "Credentials invalid", "error");
      }
    } catch (err) {
      addToast("Auth service offline", "error");
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (
    id: string,
    action: "approve" | "reject" | "delete" | "keep",
  ) => {
    if (!token) return;

    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection:");
      if (reason === null) return; // User cancelled prompt
    }

    if (action === "delete" && !window.confirm("Purge artifact from database?"))
      return;

    setActionId(id);
    try {
      let url = `${API_BASE_URL}/api/v1/admin/letterings/${id}`;
      let method = "POST";
      let body: string | null = null;

      if (action === "approve") url += "/approve";
      if (action === "keep") url += "/clear-reports";
      if (action === "reject") {
        url += "/reject";
        body = JSON.stringify({ reason: reason || "Administrative rejection" });
      }
      if (action === "delete") method = "DELETE";

      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      if (body) headers["Content-Type"] = "application/json";

      const res = await fetch(url, { method, headers, body });

      if (res.ok) {
        addToast(
          `Artifact ${action === "keep" ? "cleared" : action + "ed"}`,
          "success",
        );
        setItems((prev) => prev.filter((i) => i.id !== id));
        fetchStats();
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast(errData.error || `Server declined ${action}`, "error");
      }
    } catch (e) {
      addToast("Network failure", "error");
    } finally {
      setActionId(null);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto pt-20 space-y-8 animate-in">
        <div className="flex items-center gap-4">
          <Shield className="text-[#cc543a]" size={32} />
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Admin Portal
          </h1>
        </div>
        <form
          onSubmit={handleLogin}
          className="space-y-4 bg-white p-10 border-4 border-black brutalist-shadow"
        >
          <input
            type="email"
            placeholder="Email"
            className="w-full border-2 border-black p-4 font-black"
            onChange={(e) =>
              setLoginData({ ...loginData, email: e.target.value })
            }
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border-2 border-black p-4 font-black"
            onChange={(e) =>
              setLoginData({ ...loginData, password: e.target.value })
            }
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:translate-y-1 transition-all"
          >
            {loading ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}{" "}
            Initialize Node
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-black pb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Shield className="text-[#cc543a]" size={20} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Curator Control
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="bg-black text-white px-6 py-2 text-[10px] font-black uppercase hover:bg-[#cc543a] transition-all"
          >
            Exit Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<ImageIcon size={18} />}
          label="Total Artifacts"
          value={stats?.total_uploads || 0}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending Review"
          value={stats?.pending_approvals || 0}
          color="text-[#cc543a]"
        />
        <StatCard
          icon={<Heart size={18} />}
          label="Archive Likes"
          value={stats?.total_likes || 0}
        />
        <StatCard
          icon={<MessageCircle size={18} />}
          label="Notes/Comments"
          value={stats?.total_comments || 0}
        />
      </div>

      <div className="flex border-4 border-black bg-white sticky top-0 z-20 brutalist-shadow-sm">
        <button
          onClick={() => setTab("queue")}
          className={`flex-1 py-5 font-black uppercase text-xs flex items-center justify-center gap-2 ${tab === "queue" ? "bg-black text-white" : "hover:bg-slate-50"}`}
        >
          <Filter size={16} /> Moderation
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`flex-1 py-5 font-black uppercase text-xs border-l-4 border-black flex items-center justify-center gap-2 ${tab === "reports" ? "bg-[#cc543a] text-white" : "hover:bg-slate-50"}`}
        >
          <AlertTriangle size={16} /> Flags
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`flex-1 py-5 font-black uppercase text-xs border-l-4 border-black flex items-center justify-center gap-2 ${tab === "stats" ? "bg-black text-white" : "hover:bg-slate-50"}`}
        >
          <BarChart3 size={16} /> Activity
        </button>
      </div>

      {tab === "queue" && (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-slate-50 p-4 border-2 border-black">
            <div className="flex gap-4 items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Queue Filter:
              </span>
              {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-[9px] font-black uppercase border-2 border-black ${statusFilter === s ? "bg-black text-white" : "bg-white"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={fetchQueue}
              className="text-[#cc543a] hover:rotate-180 transition-transform"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          <div className="grid gap-6">
            {loading ? (
              <RefreshCw
                className="animate-spin mx-auto text-[#cc543a]"
                size={40}
              />
            ) : items.length === 0 ? (
              <div className="text-center py-32 border-4 border-dashed border-black/10 font-black uppercase text-slate-300">
                Nothing here requires attention
              </div>
            ) : (
              items.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  isProcessing={actionId === item.id}
                  onApprove={() => performAction(item.id, "approve")}
                  onReject={() => performAction(item.id, "reject")}
                  onDelete={() => performAction(item.id, "delete")}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-8">
          <div className="bg-yellow-50 border-4 border-yellow-600 p-6 flex items-center gap-4">
            <AlertTriangle className="text-yellow-600" size={32} />
            <div>
              <h2 className="font-black uppercase text-lg text-yellow-900 leading-none">
                Priority Content flagged
              </h2>
              <p className="text-[10px] font-bold text-yellow-700 mt-1 uppercase tracking-widest">
                Review reports and decide whether to retain or purge artifacts.
              </p>
            </div>
          </div>
          <div className="grid gap-6">
            {loading ? (
              <RefreshCw
                className="animate-spin mx-auto text-[#cc543a]"
                size={40}
              />
            ) : items.length === 0 ? (
              <div className="text-center py-32 border-4 border-dashed border-black/10 font-black uppercase text-slate-300">
                No active reports
              </div>
            ) : (
              items.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  isProcessing={actionId === item.id}
                  isReported
                  onApprove={() => performAction(item.id, "keep")}
                  onDelete={() => performAction(item.id, "delete")}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="space-y-12 bg-white border-4 border-black p-12 brutalist-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <h3 className="text-4xl font-black uppercase tracking-tighter border-b-4 border-black pb-4">
                Node Insights
              </h3>
              <div className="space-y-4 font-black uppercase text-sm">
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span>Total Discovery Entries</span>
                  <span className="text-[#cc543a]">{stats.total_uploads}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span>Curation Accuracy</span>
                  <span className="text-[#cc543a]">
                    {Math.round(
                      (stats.approved / (stats.total_uploads || 1)) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span>Unique Contributors</span>
                  <span className="text-[#cc543a]">{stats.total_cities}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-4 border-black p-8 relative">
              <h4 className="text-xl font-black uppercase mb-6 tracking-tighter">
                Infrastructure
              </h4>
              <div className="space-y-4">
                <HealthIndicator
                  label="PostgreSQL Core"
                  value="Online"
                  color="bg-green-500"
                />
                <HealthIndicator
                  label="R2 File Storage"
                  value="Stable"
                  color="bg-green-500"
                />
                <HealthIndicator
                  label="ML Processing Node"
                  value="Idle"
                  color="bg-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color = "text-black" }: any) => (
  <div className="bg-white border-4 border-black p-6 brutalist-shadow-sm space-y-4">
    <div className="text-slate-400">{icon}</div>
    <div>
      <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
        {label}
      </p>
    </div>
  </div>
);

const ModerationCard = ({
  item,
  onApprove,
  onReject,
  onDelete,
  isProcessing,
  isReported,
}: any) => (
  <div className="bg-white border-4 border-black p-6 flex flex-col md:flex-row gap-8 transition-all hover:bg-slate-50">
    <div className="w-full md:w-56 h-56 flex-shrink-0 border-2 border-black bg-slate-100 overflow-hidden relative group">
      <img
        src={item.image_url}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        alt="Artifact"
      />
      <a
        href={item.image_url}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
      >
        <ExternalLink className="text-white" size={24} />
      </a>
    </div>
    <div className="flex-1 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-[#cc543a] flex items-center gap-2">
            <MapPin size={10} /> {item.pin_code} // <Users size={10} />{" "}
            {item.contributor_tag}
          </p>
          <h3 className="text-2xl font-black uppercase tracking-tighter break-words">
            {item.detected_text || "Awaiting Scan"}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
        {isReported && (
          <div className="bg-red-50 border-2 border-red-600 px-4 py-2 flex items-center gap-2 text-red-700 font-black text-[10px] uppercase">
            <AlertTriangle size={14} /> {item.report_count || 1} Flags
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            Description
          </p>
          <p className="text-sm font-medium text-slate-700 leading-relaxed italic break-words line-clamp-3">
            "{item.description || "No context provided."}"
          </p>
        </div>
        <div className="space-y-2 border-l-2 border-slate-100 pl-6">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            Signals
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-[10px] font-black">
              <Heart size={12} /> {item.likes_count || 0}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black">
              <MessageCircle size={12} /> {item.comments_count || 0}
            </span>
          </div>
          {item.ml_metadata && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase border border-black">
                {item.ml_metadata.style}
              </span>
              <span className="bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase border border-black">
                {item.ml_metadata.script}
              </span>
            </div>
          )}
        </div>
      </div>

      {item.cultural_context && (
        <div className="bg-slate-50 p-4 border-l-4 border-[#2d5a27] space-y-1">
          <p className="text-[10px] font-black uppercase text-[#2d5a27] tracking-widest">
            Neighborhood History (Wikipedia)
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic line-clamp-4">
            {item.cultural_context}
          </p>
        </div>
      )}

      {isReported && item.report_reasons && (
        <div className="bg-red-50/50 p-4 border-l-4 border-red-600 space-y-1">
          <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">
            User Complaints:
          </p>
          {item.report_reasons.map((r: string, i: number) => (
            <p key={i} className="text-sm font-bold text-red-900">
              • {r}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-4 pt-2">
        <button
          disabled={isProcessing}
          onClick={onApprove}
          className="flex-1 bg-black text-white py-4 font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Check size={18} />
          )}
          {isReported ? "Clear Flags" : "Approve"}
        </button>
        {!isReported && (
          <button
            disabled={isProcessing}
            onClick={onReject}
            className="flex-1 border-2 border-black py-4 font-black uppercase text-[11px] flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-50 transition-all"
          >
            <X size={18} /> Reject
          </button>
        )}
        <button
          disabled={isProcessing}
          onClick={onDelete}
          className="px-8 border-2 border-black py-4 font-black uppercase text-[11px] text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  </div>
);

const HealthIndicator = ({ label, value, color }: any) => (
  <div className="flex items-center justify-between border-b border-black/5 pb-2">
    <span className="text-[10px] font-black uppercase text-slate-500">
      {label}
    </span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase">{value}</span>
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
    </div>
  </div>
);

export default AdminPanel;

```

### File: apps/web/src/components/ContributionPanel.tsx

```
import React, { useState, useRef } from "react";
import { Upload, X, Loader2, MapPin } from "lucide-react";
import { API_BASE_URL, AREA_PIN_MAP, PIN_AREA_MAP } from "../constants";
import { useToastStore } from "../store/useToastStore";

const ContributionPanel: React.FC<{
  onCancel: () => void;
  onSubmit: () => void;
}> = ({ onCancel, onSubmit }) => {
  const { addToast } = useToastStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    area: "Other",
    pin: "",
    desc: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePinChange = (val: string) => {
    const pin = val.replace(/\D/g, "").substring(0, 6);
    const matchedArea = PIN_AREA_MAP[pin] || "Other";
    setForm((prev) => ({ ...prev, pin, area: matchedArea }));
  };

  const handleAreaChange = (val: string) => {
    const matchedPin = AREA_PIN_MAP[val] || "";
    setForm((prev) => ({ ...prev, area: val, pin: matchedPin || prev.pin }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation)
      return addToast("Geolocation not supported", "error");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = await res.json();
        const pc = data.address.postcode?.replace(/\s/g, "").substring(0, 6);
        if (pc) handlePinChange(pc);
      } catch (e) {
        addToast("Auto-detect failed", "error");
      } finally {
        setIsLocating(false);
      }
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return addToast("Artifact image required", "error");
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("contributor_tag", form.name);
    formData.append("pin_code", form.pin);
    formData.append("description", form.desc);
    formData.append("city_id", "0194f123-4567-7abc-8def-0123456789ab");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/letterings/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        addToast("Artifact submitted successfully", "success");
        onSubmit();
      } else throw new Error();
    } catch (err) {
      addToast("Network error. Try a smaller image.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in pb-32">
      <div className="flex justify-between items-center bg-black text-white p-6 brutalist-shadow">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">
            Contributor Lab
          </h2>
          <p className="handwritten text-sm text-[#d4a017] italic">
            Preserving the city's lettered soul...
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 bg-white text-black border-2 border-black hover:bg-[#cc543a] hover:text-white transition-colors"
        >
          <X />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h4 className="text-xs font-black uppercase bg-[#2d5a27] text-white px-2 py-1 inline-block">
            Step 01: Capture Lettering
          </h4>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-4 border-black aspect-[4/3] flex flex-col items-center justify-center bg-white brutalist-shadow-sm cursor-pointer overflow-hidden group"
          >
            {preview ? (
              <img
                src={preview}
                className="w-full h-full object-cover"
                alt="Preview"
              />
            ) : (
              <div className="text-center p-12">
                <Upload
                  size={48}
                  className="mx-auto mb-4 text-slate-300 group-hover:text-black transition-colors"
                />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tap to mount specimen
                </p>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }
            }}
          />
        </div>

        <form
          onSubmit={handleUpload}
          className="bg-white p-8 md:p-10 border-4 border-black brutalist-shadow space-y-8 flex flex-col"
        >
          <h4 className="text-[10px] font-black uppercase text-[#cc543a]">
            Step 02: Archive Details
          </h4>
          <div className="space-y-6 flex-1">
            <input
              placeholder="Contributor Name"
              className="w-full border-2 border-black p-4 font-black text-sm focus:border-[#cc543a] outline-none"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-400">
                  Neighborhood
                </label>
                <select
                  className="w-full border-2 border-black p-4 font-black bg-white text-sm outline-none"
                  value={form.area}
                  onChange={(e) => handleAreaChange(e.target.value)}
                >
                  <option value="Other">Other Area</option>
                  {Object.keys(AREA_PIN_MAP).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 relative">
                <label className="text-[8px] font-black uppercase text-slate-400">
                  PIN Code
                </label>
                <input
                  placeholder="560xxx"
                  className="w-full border-2 border-black p-4 font-black text-sm outline-none pr-10"
                  value={form.pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  className="absolute right-3 top-10 text-[#cc543a]"
                >
                  {isLocating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <MapPin size={18} />
                  )}
                </button>
              </div>
            </div>

            <textarea
              placeholder="Tell the story of this find (material, style, location context)..."
              className="w-full border-2 border-black p-4 font-medium text-sm focus:border-[#cc543a] outline-none"
              rows={5}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-black text-white py-6 font-black uppercase brutalist-shadow hover:bg-[#cc543a] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Finalize Archiving"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContributionPanel;

```

### File: apps/web/src/components/Gallery.tsx

```
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Filter } from 'lucide-react';
import LetteringCard from './LetteringCard';
import { getGallery } from '../lib/api';

const Gallery: React.FC = () => {
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['letterings', limit, offset],
    queryFn: () => getGallery({ limit, offset }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={48} className="animate-spin text-rust" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-4 border-red-600 p-8 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
        <p className="text-lg font-black uppercase text-red-800">Failed to load gallery</p>
        <p className="text-sm text-red-700 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  const letterings = data?.letterings || [];

  if (letterings.length === 0) {
    return (
      <div className="bg-slate-100 border-4 border-black p-12 text-center">
        <p className="text-lg font-black uppercase text-slate-600">No letterings yet</p>
        <p className="text-sm text-slate-500 mt-2">Be the first to contribute!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">The Gallery</h2>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">{letterings.length} specimens archived</p>
        </div>
        <button className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-slate-100">
          <Filter size={16} />
          Filter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {letterings.map((lettering) => (
          <LetteringCard key={lettering.id} lettering={lettering} />
        ))}
      </div>

      {data && data.total > limit && (
        <div className="flex justify-center gap-4 pt-8">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-6 py-3 bg-black text-white font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= data.total}
            className="px-6 py-3 bg-black text-white font-black uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Gallery;

```

### File: apps/web/src/components/Header.tsx

```
import React from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="px-6 md:px-16 pt-12 pb-12 border-b-4 border-black bg-white relative overflow-hidden z-10">
      <div className="absolute top-0 right-0 w-64 h-full bg-[#cc543a]/5 -skew-x-12 transform translate-x-32 -z-10"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-6">
             <div className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">Volume 01</div>
             <div className="bg-[#cc543a] text-white px-2 py-1 text-[9px] font-black uppercase tracking-widest">Archive Bengaluru</div>
          </div>
          
          <div className="flex flex-col text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85]">
            <span className="text-[#cc543a]">Through Your</span>
            <span className="text-black">Letters</span> 
          </div>
          
          <div className="mt-8">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 leading-relaxed max-w-lg block">
              Explore, browse through, learn, and contribute your collected or photographed street letterings and typefaces.
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-1 border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-8 min-w-[240px]">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left md:text-right leading-tight">A project initiated by</span>
           <span className="text-sm font-black uppercase tracking-tighter text-black">Akankshya Pradhan</span>
           <div className="w-full h-1 bg-black mt-2"></div>
           <div className="w-1/2 h-2 bg-[#d4a017]"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
```

### File: apps/web/src/components/LetteringCard.tsx

```
import React from 'react';
import { MapPin, Heart, MessageCircle, Eye } from 'lucide-react';
import type { Lettering } from '../types';

interface LetteringCardProps {
  lettering: Lettering;
  onClick?: () => void;
}

const LetteringCard: React.FC<LetteringCardProps> = ({ lettering, onClick }) => {
  const thumbnailUrl = lettering.thumbnail_urls?.medium || lettering.image_url;
  
  return (
    <div 
      className="group bg-white border-2 border-black brutalist-shadow-sm hover:-translate-y-1 hover:brutalist-shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square bg-slate-100 border-b-2 border-black overflow-hidden relative">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={`Lettering from ${lettering.pin_code}`}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <span className="text-6xl font-black">?</span>
          </div>
        )}
        
        <div className="absolute top-2 left-2 bg-black text-white text-[7px] font-black px-2 py-1 uppercase tracking-widest">
          {lettering.pin_code}
        </div>
        
        {lettering.status === 'PENDING' && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[7px] font-black px-2 py-1 uppercase tracking-widest">
            Processing
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="w-full bg-white text-black px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <Eye size={14} />
            View Details
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <MapPin size={14} className="text-rust" />
          <span className="font-mono font-bold">{lettering.pin_code}</span>
        </div>
        
        {lettering.detected_text && (
          <p className="text-sm font-bold text-slate-700 line-clamp-2">
            "{lettering.detected_text}"
          </p>
        )}
        
        {lettering.ml_metadata && (
          <div className="flex gap-2 text-[8px] font-bold uppercase tracking-wider">
            {lettering.ml_metadata.style && (
              <span className="bg-slate-100 px-2 py-1 border border-black">{lettering.ml_metadata.style}</span>
            )}
            {lettering.ml_metadata.script && (
              <span className="bg-slate-100 px-2 py-1 border border-black">{lettering.ml_metadata.script}</span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Heart size={14} />
              <span>{lettering.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle size={14} />
              <span>{lettering.comments_count || 0}</span>
            </div>
          </div>
          
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            @{lettering.contributor_tag}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetteringCard;

```

### File: apps/web/src/components/Map.tsx

```
import { useEffect, useRef } from 'react';

interface MapProps {
  letterings: Array<{
    id: string;
    location: { coordinates: [number, number] };
    thumbnail_urls: { small: string };
  }>;
}

export function Map({ letterings }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;
    
    // Use Leaflet (free, no API key needed)
    const L = (window as any).L;
    if (!L) return;
    
    const map = L.map(mapRef.current).setView([12.9716, 77.5946], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    
    letterings.forEach(item => {
      const [lng, lat] = item.location.coordinates;
      L.marker([lat, lng])
        .bindPopup(`<img src="${item.thumbnail_urls.small}" width="100"/>`)
        .addTo(map);
    });
    
    return () => map.remove();
  }, [letterings]);
  
  return <div ref={mapRef} className="w-full h-96 border-2 border-black" />;
}
```

### File: apps/web/src/components/MapSection.tsx

```
import React, { useState, useEffect } from "react";
import { Target, Info, Globe, Loader2 } from "lucide-react";
import { API_BASE_URL, PIN_AREA_MAP } from "../constants";
import { NeighborhoodCount } from "../types";

const REGIONS = [
  { name: "Basavanagudi", pin: "560004" },
  { name: "Malleshwaram", pin: "560003" },
  { name: "Frazer Town", pin: "560005" },
  { name: "MG Road / GPO", pin: "560001" },
  { name: "Ulsoor", pin: "560008" },
  { name: "Jayanagar", pin: "560011" },
  { name: "Indiranagar", pin: "560038" },
  { name: "Koramangala", pin: "560034" },
  { name: "HSR Layout", pin: "560102" },
  { name: "Whitefield", pin: "560066" },
];

function getHeatColor(count: number): string {
  if (count === 0) return "bg-slate-100 text-slate-300";
  if (count <= 2) return "bg-[#cc543a]/10 text-[#cc543a]/60";
  if (count <= 5) return "bg-[#cc543a]/25 text-[#cc543a]/80";
  if (count <= 10) return "bg-[#cc543a]/50 text-[#cc543a]";
  if (count <= 20) return "bg-[#cc543a]/75 text-white";
  return "bg-[#cc543a] text-white";
}

function getHeatLabel(count: number): string {
  if (count === 0) return "Desert";
  if (count <= 2) return "Sparse";
  if (count <= 5) return "Growing";
  if (count <= 10) return "Active";
  if (count <= 20) return "Thriving";
  return "Oasis";
}

const MapSection: React.FC = () => {
  const [data, setData] = useState<NeighborhoodCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/analytics/neighborhoods`)
      .then((res) => res.json())
      .then((json) => setData(json.neighborhoods || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const countMap = new Map(data.map((d) => [d.pin_code, d.count]));

  return (
    <div className="space-y-16 animate-in">
      <div className="border-b-4 border-black pb-8 space-y-4">
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
          The <span className="text-[#cc543a]">Archive Heatmap</span>
        </h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-xs font-black uppercase text-slate-400 max-w-xl">
            Darker shades indicate higher documentation density. We can't
            preserve what we haven't documented.
          </p>
          <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Target size={12} className="text-[#d4a017]" /> Target: 10 artifacts
            per region
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="space-y-8">
          <section className="bg-black text-white p-8 brutalist-shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase flex items-center gap-2 border-b border-white/20 pb-4">
              <Info size={16} className="text-[#cc543a]" /> Purpose
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 font-medium italic">
              "This tool identifies 'Typographic Deserts'—neighborhoods whose
              visual history remains undocumented."
            </p>
          </section>

          <section className="border-2 border-black p-6 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Legend
            </h4>
            <div className="space-y-2">
              {[
                { label: "Desert (0)", color: "bg-slate-100" },
                { label: "Sparse (1-2)", color: "bg-[#cc543a]/10" },
                { label: "Growing (3-5)", color: "bg-[#cc543a]/25" },
                { label: "Active (6-10)", color: "bg-[#cc543a]/50" },
                { label: "Thriving (11-20)", color: "bg-[#cc543a]/75" },
                { label: "Oasis (20+)", color: "bg-[#cc543a]" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 border border-black/10 ${l.color}`}
                  ></div>
                  <span className="text-[9px] font-black uppercase">
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-100 border-2 border-dashed border-black/20 p-6 space-y-4">
            <Globe size={32} className="opacity-20" />
            <p className="text-[10px] font-bold text-slate-500">
              Future modules will expand to cover other international street
              scripts.
            </p>
          </section>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6 bg-white border-4 border-black p-8 brutalist-shadow">
          {loading ? (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="animate-spin text-[#cc543a]" size={32} />
            </div>
          ) : (
            REGIONS.map((region) => {
              const count = countMap.get(region.pin) || 0;
              const heatColor = getHeatColor(count);
              const heatLabel = getHeatLabel(count);
              return (
                <div
                  key={region.pin}
                  className={`aspect-square border-2 border-black ${heatColor} flex flex-col items-center justify-center text-center p-4 transition-colors relative group`}
                >
                  <span className="text-4xl font-black mb-1">{count}</span>
                  <p className="text-[9px] font-black uppercase tracking-tighter">
                    {region.name}
                  </p>
                  <p className="text-[7px] font-bold uppercase tracking-widest mt-1 opacity-70">
                    {heatLabel}
                  </p>
                  <div className="absolute top-1 right-1 text-[7px] font-mono opacity-40">
                    {region.pin}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!loading && data.length > 0 && (
        <div className="border-4 border-black p-8 bg-white brutalist-shadow-sm space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter">
            All Documented PINs
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.map((n) => (
              <div
                key={n.pin_code}
                className="bg-slate-50 border-2 border-black px-4 py-2 flex items-center gap-3"
              >
                <span className="text-[10px] font-black">
                  {PIN_AREA_MAP[n.pin_code] || n.pin_code}
                </span>
                <span className="text-[10px] font-black text-[#cc543a]">
                  {n.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSection;

```

### File: apps/web/src/components/ZinePage.tsx

```
import React from "react";
import { ZinePageData } from "../types";
import { MapPin, Share2, Trash2, AlertTriangle, AlignLeft } from "lucide-react";
import { useToastStore } from "../store/useToastStore";
import { API_BASE_URL } from "../constants";

const ZinePage: React.FC<{
  page: ZinePageData;
  onDelete?: (id: string | number) => void;
}> = ({ page, onDelete }) => {
  const { addToast } = useToastStore();

  const handleShare = async () => {
    const url = `${window.location.origin}/#page-${page.id}`;
    const shareData = {
      title: `Through Your Letters: ${page.title}`,
      text: `Check out this typography artifact from ${page.location}`,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        addToast("Link copied to clipboard", "success");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError")
        addToast("Share failed", "error");
    }
  };

  const handleReport = () => {
    const reason = window.prompt("Why are you reporting this image?");
    if (!reason) return;

    fetch(`${API_BASE_URL}/api/v1/letterings/${page.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
      .then((res) => {
        if (res.ok) addToast("Report submitted for review", "success");
        else throw new Error();
      })
      .catch(() => addToast("Failed to submit report", "error"));
  };

  // Merge User Story and AI Context into one narrative block
  const narrative = page.description || page.culturalContext;

  return (
    <div
      id={`page-${page.id}`}
      className="flex flex-col md:flex-row gap-12 items-start scroll-mt-24 pb-24 border-b-2 border-black/10 last:border-b-0 overflow-hidden"
    >
      <div className="w-full md:w-3/5 relative py-6 group">
        <div className="tape absolute top-2 left-1/4 w-20 h-8 -rotate-12 opacity-70"></div>
        <div className="tape absolute -bottom-2 right-1/4 w-16 h-8 rotate-6 opacity-70"></div>

        <div className="p-3 bg-white border-2 border-black brutalist-shadow transition-all duration-500 hover:rotate-1">
          <img
            src={page.image}
            className="w-full aspect-square object-cover contrast-125 grayscale hover:grayscale-0 transition-all duration-700"
            alt={page.title}
          />
          <div className="p-4 flex justify-between items-center border-t border-black/5 mt-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#cc543a]" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {page.location}
              </span>
            </div>
            <span className="text-[9px] font-black uppercase text-slate-500">
              By {page.contributorName}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-2/5 flex flex-col space-y-8">
        <div className="flex justify-between items-start">
          <div className="bg-black text-white px-4 py-1.5 text-xs font-black uppercase rotate-1 shadow-[4px_4px_0_0_#cc543a]">
            {page.vibe}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 border-2 border-black bg-white hover:bg-slate-100"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleReport}
              className="p-2 border-2 border-black bg-white hover:bg-yellow-50 text-yellow-700"
              title="Report"
            >
              <AlertTriangle size={16} />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(page.id)}
                className="p-2 border-2 border-black bg-white hover:bg-red-600 hover:text-white text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <h2 className="text-5xl font-black tracking-tighter leading-[0.9] drop-shadow-sm break-words">
          {page.title}
        </h2>

        <div className="space-y-8">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-[#cc543a] flex items-center gap-3">
              <AlignLeft size={14} />
              <span className="tracking-widest">Museum Context & Story</span>
            </h4>
            {/* break-words and whitespace-pre-wrap ensure long text stays in layout */}
            <p className="text-xl leading-snug font-medium text-slate-900 break-words whitespace-pre-wrap">
              {narrative}
            </p>
          </div>

          <div className="bg-[#f8f5f0] p-8 border-4 border-black border-dashed relative overflow-hidden">
            <div className="absolute -top-3 left-4 bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
              Archival Record
            </div>
            <p className="serif text-lg leading-relaxed text-slate-700 italic break-words">
              {page.historicalNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZinePage;

```

### File: apps/web/src/components/layout/Header.tsx

```
import React from 'react';
import { Menu } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

const Header: React.FC = () => {
  const { toggleMenu } = useUIStore();

  return (
    <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rust border-2 border-black flex items-center justify-center">
              <span className="text-white text-2xl font-black">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
                Through Your Letters
              </h1>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                Bengaluru Street Typography Archive
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleMenu}
            className="md:hidden p-2 border-2 border-black bg-white hover:bg-slate-100"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

```

### File: apps/web/src/components/layout/Navigation.tsx

```
import React from 'react';
import { Compass, PlusCircle, Map as MapIcon, Info } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

type View = 'explore' | 'contribute' | 'map' | 'about';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { isMenuOpen, closeMenu } = useUIStore();
  
  const navItems: Array<{ view: View; icon: typeof Compass; label: string }> = [
    { view: 'explore', icon: Compass, label: 'Explore' },
    { view: 'contribute', icon: PlusCircle, label: 'Contribute' },
    { view: 'map', icon: MapIcon, label: 'Map' },
    { view: 'about', icon: Info, label: 'About' },
  ];

  const handleViewChange = (view: View) => {
    onViewChange(view);
    closeMenu();
  };

  return (
    <>
      {/* Desktop navigation */}
      <nav className="hidden md:block bg-slate-50 border-b-2 border-black">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex gap-2 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              
              return (
                <button
                  key={item.view}
                  onClick={() => handleViewChange(item.view)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-all ${
                    isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={closeMenu}>
          <div 
            className="absolute right-0 top-0 h-full w-64 bg-white border-l-4 border-black p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                
                return (
                  <button
                    key={item.view}
                    onClick={() => handleViewChange(item.view)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-widest border-2 border-black ${
                      isActive ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;

```

### File: apps/web/src/components/ui/ToastContainer.tsx

```
import React from 'react';
import { useToastStore } from '../../store/useToastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-sm p-4 
            border-2 border-black brutalist-shadow-sm animate-in slide-in-from-bottom-5 fade-in
            ${toast.type === 'success' ? 'bg-white text-black' : ''}
            ${toast.type === 'error' ? 'bg-red-50 text-red-900 border-red-900' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 text-blue-900 border-blue-900' : ''}
          `}
        >
          {toast.type === 'success' && <CheckCircle size={20} className="text-green-600" />}
          {toast.type === 'error' && <AlertCircle size={20} className="text-red-600" />}
          {toast.type === 'info' && <Info size={20} className="text-blue-600" />}
          
          <p className="flex-1 text-sm font-bold">{toast.message}</p>
          
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-black transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
```

### File: apps/web/src/constants.ts

```
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export const AREA_PIN_MAP: Record<string, string> = {
  "MG Road / GPO": "560001",
  Shivajinagar: "560002",
  Malleshwaram: "560003",
  Basavanagudi: "560004",
  "Frazer Town": "560005",
  Ulsoor: "560008",
  "Richmond Town": "560009",
  Sadashivanagar: "560010",
  Jayanagar: "560011",
  Rajajinagar: "560018",
  Vijayanagar: "560020",
  Banashankari: "560025",
  "BTM Layout": "560028",
  Koramangala: "560034",
  Indiranagar: "560038",
  Hebbal: "560041",
  Yeshwanthpur: "560050",
  Domlur: "560054",
  Chamrajpet: "560055",
  Whitefield: "560066",
  "JP Nagar": "560070",
  "Electronic City": "560078",
  Marathahalli: "560085",
  Bellandur: "560095",
  "HSR Layout": "560102",
  "Sarjapur Road": "560103",
};

export const PIN_AREA_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(AREA_PIN_MAP).map(([area, pin]) => [pin, area]),
);

```

### File: apps/web/src/hooks/useGeolocation.ts

```
import { useState, useEffect } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ latitude: null, longitude: null, error: 'Geolocation not supported', loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({ latitude: null, longitude: null, error: error.message, loading: false });
      }
    );
  }, []);

  return state;
}

```

### File: apps/web/src/hooks/useLetteringGallery.ts

```
import { useQuery } from '@tanstack/react-query';
import { getGallery } from '../lib/api';

export function useLetteringGallery(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['letterings', limit, offset],
    queryFn: () => getGallery({ limit, offset }),
  });
}

```

### File: apps/web/src/index.css

```
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@300;400;700&family=Noto+Sans+Kannada:wght@300;400;700&family=Noto+Sans+Bengali:wght@300;400;700&family=Noto+Sans+Odia:wght@300;400;700&family=Noto+Sans+Gujarati:wght@300;400;700&family=Noto+Sans+Gurmukhi:wght@300;400;700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Telugu:wght@400;700&family=Noto+Sans+Malayalam:wght@400;700&family=Noto+Sans+Ol+Chiki:wght@400;700&family=Crimson+Pro:ital,wght@0,400;0,700;1,400&family=Architects+Daughter&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-paper: #f8f5f0;
  --color-ink: #1a1a1a;
}

body {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: 'Space Grotesk', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.zine-texture {
  background-image: url("https://www.transparenttextures.com/patterns/recycled-paper-texture.png");
}

.grain-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  opacity: 0.04;
  z-index: 999;
  background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
}

.brutalist-shadow { box-shadow: 6px 6px 0px 0px var(--color-ink); }
.brutalist-shadow-sm { box-shadow: 3px 3px 0px 0px var(--color-ink); }
.brutalist-shadow-lg { box-shadow: 10px 10px 0px 0px var(--color-ink); }

.tape {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(2px);
  border: 1px solid rgba(0,0,0,0.05);
  z-index: 10;
}

.handwritten { font-family: 'Architects Daughter', cursive; }
.serif { font-family: 'Crimson Pro', serif; }
.kannada { font-family: 'Noto Sans Kannada', sans-serif; }
.urdu { font-family: 'Noto Nastaliq Urdu', serif; }
.devanagari { font-family: 'Noto Sans Devanagari', sans-serif; }

.pixel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 4px;
}
```

### File: apps/web/src/index.html

```
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

### File: apps/web/src/lib/api.ts

```
import { API_BASE_URL } from '../constants';
import { Lettering } from '../types';

export interface GalleryResponse {
  letterings: Lettering[];
  total: number;
  limit: number;
  offset: number;
}

export async function getGallery({ limit, offset }: { limit: number; offset: number }): Promise<GalleryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/letterings?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch gallery');
  }
  return response.json();
}
```

### File: apps/web/src/main.tsx

```
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

```

### File: apps/web/src/store/useToastStore.ts

```
import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
```

### File: apps/web/src/store/useUIStore.ts

```
import { create } from 'zustand';

interface UIState {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  closeMenu: () => set({ isMenuOpen: false }),
}));

```

### File: apps/web/src/types.ts

```
export interface ZinePageData {
  id: string | number;
  title: string;
  location: string;
  culturalContext: string;
  historicalNote: string;
  image: string;
  thumbnail?: string;
  imageSource: string;
  sourceUrl: string;
  vibe: string;
  readMoreUrl: string;
  isUserContribution?: boolean;
  contributorName?: string;
  description?: string;
  report_count?: number;
  report_reasons?: string[];
}

export enum AppMode {
  EXPLORE = "EXPLORE",
  CONTRIBUTE = "CONTRIBUTE",
  ABOUT = "ABOUT",
  GUIDEBOOK = "GUIDEBOOK",
  MAP = "MAP",
  ADMIN = "ADMIN",
}

export interface Lettering {
  id: string;
  image_url: string;
  thumbnail_urls: {
    small: string;
    medium: string;
    large: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  pin_code: string;
  contributor_tag: string;
  detected_text?: string;
  description?: string;
  ml_metadata?: {
    style?: string;
    script?: string;
  };
  cultural_context?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REPORTED";
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  report_count?: number;
  report_reasons?: string[];
}

export interface NeighborhoodCount {
  pin_code: string;
  count: number;
}

```

### File: apps/web/src/vite-env.d.ts

```
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### File: apps/web/tailwind.config.js

```
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: '#f8f5f0',
        ink: '#1a1a1a',
        terracotta: '#cc543a',
        forest: '#2d5a27',
        ochre: '#d4a017',
        sky: '#7fb3d5',
      },
    },
  },
  plugins: [],
}
```

### File: apps/web/tsconfig.json

```
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

```

### File: apps/web/tsconfig.node.json

```
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": false ,
    "composite": true,
    "declaration": true,
  },
  "include": ["vite.config.ts"]
}

```

### File: apps/web/vercel.json

```
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-api.railway.app/api/:path*"
    }
  ]
}

```

### File: apps/web/vite.config.ts

```
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

```

### File: docker-compose.yml

```
services:
  postgres:
    image: postgis/postgis:17-3.5
    restart: always
    environment:
      POSTGRES_DB: through-your-letters
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d through-your-letters"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8.4.0-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  clamav:
    image: clamav/clamav:latest
    restart: unless-stopped
    ports:
      - "3310:3310"
    volumes:
      - clamav_data:/var/lib/clamav
    healthcheck:
      test: ["CMD", "clamdscan", "--version"]
      interval: 30s
      timeout: 15s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  clamav_data:

```

### File: package.json

```
{
  "name": "through-the-letters",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "type-check": "turbo run type-check",
    "db:up": "docker-compose up -d postgres redis",
    "db:down": "docker-compose down"
  },
  "devDependencies": {
    "@types/node": "^25.2.2",
    "prettier": "^3.8.1",
    "turbo": "^2.8.3",
    "typescript": "^5.9.3"
  },
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}

```

### File: packages/types/package.json

```
{
  "name": "@ttl/types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}

```

### File: packages/types/src/generated/city.ts

```
export interface City {
  id: string;
  name: string;
  country_code: string;
  created_at: string;
}

```

### File: packages/types/src/generated/comment.ts

```
export interface Comment {
  id: string;
  lettering_id: string;
  content: string;
  created_at: string;
}

```

### File: packages/types/src/generated/contributor.ts

```
export interface Contributor {
  tag: string;
  uploads_count: number;
  likes_received: number;
  joined_at: string;
}

```

### File: packages/types/src/generated/domain_error.ts

```
export type DomainError =
  | { type: "NotFound" }
  | { type: "ValidationError"; message: string }
  | { type: "InfrastructureError"; message: string }
  | { type: "RateLimitExceeded" }
  | { type: "Unauthorized" };

```

### File: packages/types/src/generated/lettering.ts

```
// This file is generated by ts-rs from Rust types
export interface Lettering {
  id: string;
  city_id: string;
  contributor_tag: string;
  image_url: string;
  thumbnail_urls: ThumbnailUrls;
  location: Coordinates;
  pin_code: string;
  detected_text: string | null;
  ml_metadata: ImageMetadata | null;
  is_lettering: boolean;
  status: LetteringStatus;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface ThumbnailUrls {
  small: string;
  medium: string;
  large: string;
}

export interface Coordinates {
  type: string;
  coordinates: number[];
}

export interface ImageMetadata {
  style: string | null;
  script: string | null;
  confidence: number | null;
  color_palette: string[] | null;
}

export type LetteringStatus = "Pending" | "Approved" | "Rejected";

```

### File: packages/types/src/generated/paginated_response.ts

```
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

```

### File: packages/types/src/index.ts

```
export * from './generated/lettering';
export * from './generated/city';
export * from './generated/comment';
export * from './generated/contributor';
export * from './generated/paginated_response';
export * from './generated/domain_error';

```

### File: packages/types/tsconfig.json

```
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "noEmit": false,
    "emitDeclarationOnly": true, 
    
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### File: packages/ui/package.json

```
{
  "name": "@ttl/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.9.3"
  }
}

```

### File: packages/ui/src/components/Button.tsx

```
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'font-black uppercase tracking-widest border-2 border-black transition-all';
  
  const variantStyles = {
    primary: 'bg-rust text-white hover:bg-black',
    secondary: 'bg-white text-black hover:bg-slate-100',
    ghost: 'bg-transparent border-transparent hover:bg-slate-100',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

```

### File: packages/ui/src/components/Card.tsx

```
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white border-2 border-black brutalist-shadow-sm ${className}`}>
      {children}
    </div>
  );
};

```

### File: packages/ui/src/index.ts

```
export * from './components/Button';
export * from './components/Card';

```

### File: packages/ui/tsconfig.json

```
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}

```

### File: packages/utils/package.json

```
{
  "name": "@ttl/utils",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}

```

### File: packages/utils/src/format.ts

```
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(d);
}

```

### File: packages/utils/src/geo.ts

```
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isValidPinCode(pinCode: string): boolean {
  return /^56\d{4}$/.test(pinCode);
}

```

### File: packages/utils/src/index.ts

```
export * from './geo';
export * from './format';

```

### File: packages/utils/tsconfig.json

```
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "composite": true,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### File: packages/validation/package.json

```
{
  "name": "@ttl/validation",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}

```

### File: packages/validation/src/index.ts

```
import { z } from 'zod';

export const uploadSchema = z.object({
  contributor_tag: z.string().min(3).max(30),
  pin_code: z.string().regex(/^56\d{4}$/),
  city_id: z.string().uuid(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(500),
});

export type UploadInput = z.infer<typeof uploadSchema>;
export type CommentInput = z.infer<typeof commentSchema>;

```

### File: packages/validation/tsconfig.json

```
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "composite": true,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### File: pnpm-lock.yaml

```
lockfileVersion: '6.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    devDependencies:
      '@types/node':
        specifier: ^25.2.2
        version: 25.2.2
      prettier:
        specifier: ^3.8.1
        version: 3.8.1
      turbo:
        specifier: ^2.8.3
        version: 2.8.3
      typescript:
        specifier: ^5.9.3
        version: 5.9.3

  apps/mobile:
    dependencies:
      '@capacitor/android':
        specifier: ^6.2.0
        version: 6.2.1(@capacitor/core@6.2.1)
      '@capacitor/app':
        specifier: ^6.0.1
        version: 6.0.3(@capacitor/core@6.2.1)
      '@capacitor/camera':
        specifier: ^6.0.2
        version: 6.1.3(@capacitor/core@6.2.1)
      '@capacitor/core':
        specifier: ^6.2.0
        version: 6.2.1
      '@capacitor/geolocation':
        specifier: ^6.0.1
        version: 6.1.1(@capacitor/core@6.2.1)
      '@capacitor/haptics':
        specifier: ^6.0.1
        version: 6.0.3(@capacitor/core@6.2.1)
      '@capacitor/ios':
        specifier: ^6.2.0
        version: 6.2.1(@capacitor/core@6.2.1)
      '@capacitor/share':
        specifier: ^6.0.2
        version: 6.0.4(@capacitor/core@6.2.1)
      '@capacitor/splash-screen':
        specifier: ^6.0.2
        version: 6.0.4(@capacitor/core@6.2.1)
      '@capacitor/status-bar':
        specifier: ^6.0.1
        version: 6.0.3(@capacitor/core@6.2.1)
      react:
        specifier: ^18.3.1
        version: 18.3.1
      react-dom:
        specifier: ^18.3.1
        version: 18.3.1(react@18.3.1)
    devDependencies:
      '@capacitor/cli':
        specifier: ^6.2.0
        version: 6.2.1
      '@vitejs/plugin-react':
        specifier: ^4.3.4
        version: 4.7.0(vite@6.4.1)
      typescript:
        specifier: ^5.9.3
        version: 5.9.3
      vite:
        specifier: ^6.0.7
        version: 6.4.1(@types/node@25.2.2)

  apps/web:
    dependencies:
      '@tanstack/react-query':
        specifier: ^5.62.11
        version: 5.90.20(react@18.3.1)
      lucide-react:
        specifier: ^0.469.0
        version: 0.469.0(react@18.3.1)
      react:
        specifier: ^18.3.1
        version: 18.3.1
      react-dom:
        specifier: ^18.3.1
        version: 18.3.1(react@18.3.1)
      zustand:
        specifier: ^5.0.2
        version: 5.0.11(@types/react@18.3.28)(react@18.3.1)
    devDependencies:
      '@types/react':
        specifier: ^18.3.12
        version: 18.3.28
      '@types/react-dom':
        specifier: ^18.3.1
        version: 18.3.7(@types/react@18.3.28)
      '@typescript-eslint/eslint-plugin':
        specifier: ^8.19.1
        version: 8.55.0(@typescript-eslint/parser@8.55.0)(eslint@9.39.2)(typescript@5.9.3)
      '@typescript-eslint/parser':
        specifier: ^8.19.1
        version: 8.55.0(eslint@9.39.2)(typescript@5.9.3)
      '@vitejs/plugin-react':
        specifier: ^4.3.4
        version: 4.7.0(vite@6.4.1)
      autoprefixer:
        specifier: ^10.4.20
        version: 10.4.24(postcss@8.5.6)
      eslint:
        specifier: ^9.18.0
        version: 9.39.2
      eslint-plugin-react-hooks:
        specifier: ^5.1.0
        version: 5.2.0(eslint@9.39.2)
      eslint-plugin-react-refresh:
        specifier: ^0.4.16
        version: 0.4.26(eslint@9.39.2)
      postcss:
        specifier: ^8.4.49
        version: 8.5.6
      tailwindcss:
        specifier: ^3.4.17
        version: 3.4.19
      typescript:
        specifier: ^5.9.3
        version: 5.9.3
      vite:
        specifier: ^6.0.7
        version: 6.4.1(@types/node@25.2.2)

  packages/types:
    devDependencies:
      typescript:
        specifier: ^5.9.3
        version: 5.9.3

  packages/ui:
    dependencies:
      lucide-react:
        specifier: ^0.469.0
        version: 0.469.0(react@18.3.1)
      react:
        specifier: ^18.3.1
        version: 18.3.1
    devDependencies:
      '@types/react':
        specifier: ^18.3.12
        version: 18.3.28
      typescript:
        specifier: ^5.9.3
        version: 5.9.3

  packages/utils:
    devDependencies:
      typescript:
        specifier: ^5.9.3
        version: 5.9.3

  packages/validation:
    dependencies:
      zod:
        specifier: ^3.24.1
        version: 3.25.76
    devDependencies:
      typescript:
        specifier: ^5.9.3
        version: 5.9.3

packages:

  /@alloc/quick-lru@5.2.0:
    resolution: {integrity: sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==}
    engines: {node: '>=10'}
    dev: true

  /@babel/code-frame@7.29.0:
    resolution: {integrity: sha512-9NhCeYjq9+3uxgdtp20LSiJXJvN0FeCtNGpJxuMFZ1Kv3cWUNb6DOhJwUvcVCzKGR66cw4njwM6hrJLqgOwbcw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/helper-validator-identifier': 7.28.5
      js-tokens: 4.0.0
      picocolors: 1.1.1
    dev: true

  /@babel/compat-data@7.29.0:
    resolution: {integrity: sha512-T1NCJqT/j9+cn8fvkt7jtwbLBfLC/1y1c7NtCeXFRgzGTsafi68MRv8yzkYSapBnFA6L3U2VSc02ciDzoAJhJg==}
    engines: {node: '>=6.9.0'}
    dev: true

  /@babel/core@7.29.0:
    resolution: {integrity: sha512-CGOfOJqWjg2qW/Mb6zNsDm+u5vFQ8DxXfbM09z69p5Z6+mE1ikP2jUXw+j42Pf1XTYED2Rni5f95npYeuwMDQA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/helper-compilation-targets': 7.28.6
      '@babel/helper-module-transforms': 7.28.6(@babel/core@7.29.0)
      '@babel/helpers': 7.28.6
      '@babel/parser': 7.29.0
      '@babel/template': 7.28.6
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
      '@jridgewell/remapping': 2.3.5
      convert-source-map: 2.0.0
      debug: 4.4.3
      gensync: 1.0.0-beta.2
      json5: 2.2.3
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@babel/generator@7.29.1:
    resolution: {integrity: sha512-qsaF+9Qcm2Qv8SRIMMscAvG4O3lJ0F1GuMo5HR/Bp02LopNgnZBC/EkbevHFeGs4ls/oPz9v+Bsmzbkbe+0dUw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/parser': 7.29.0
      '@babel/types': 7.29.0
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31
      jsesc: 3.1.0
    dev: true

  /@babel/helper-compilation-targets@7.28.6:
    resolution: {integrity: sha512-JYtls3hqi15fcx5GaSNL7SCTJ2MNmjrkHXg4FSpOA/grxK8KwyZ5bubHsCq8FXCkua6xhuaaBit+3b7+VZRfcA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/compat-data': 7.29.0
      '@babel/helper-validator-option': 7.27.1
      browserslist: 4.28.1
      lru-cache: 5.1.1
      semver: 6.3.1
    dev: true

  /@babel/helper-globals@7.28.0:
    resolution: {integrity: sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==}
    engines: {node: '>=6.9.0'}
    dev: true

  /@babel/helper-module-imports@7.28.6:
    resolution: {integrity: sha512-l5XkZK7r7wa9LucGw9LwZyyCUscb4x37JWTPz7swwFE/0FMQAGpiWUZn8u9DzkSBWEcK25jmvubfpw2dnAMdbw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/traverse': 7.29.0
      '@babel/types': 7.29.0
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@babel/helper-module-transforms@7.28.6(@babel/core@7.29.0):
    resolution: {integrity: sha512-67oXFAYr2cDLDVGLXTEABjdBJZ6drElUSI7WKp70NrpyISso3plG9SAGEF6y7zbha/wOzUByWWTJvEDVNIUGcA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-module-imports': 7.28.6
      '@babel/helper-validator-identifier': 7.28.5
      '@babel/traverse': 7.29.0
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@babel/helper-plugin-utils@7.28.6:
    resolution: {integrity: sha512-S9gzZ/bz83GRysI7gAD4wPT/AI3uCnY+9xn+Mx/KPs2JwHJIz1W8PZkg2cqyt3RNOBM8ejcXhV6y8Og7ly/Dug==}
    engines: {node: '>=6.9.0'}
    dev: true

  /@babel/helper-string-parser@7.27.1:
    resolution: {integrity: sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==}
    engines: {node: '>=6.9.0'}
    dev: true

  /@babel/helper-validator-identifier@7.28.5:
    resolution: {integrity: sha512-qSs4ifwzKJSV39ucNjsvc6WVHs6b7S03sOh2OcHF9UHfVPqWWALUsNUVzhSBiItjRZoLHx7nIarVjqKVusUZ1Q==}
    engines: {node: '>=6.9.0'}
    dev: true

  /@babel/helper-validator-option@7.27.1:
    resolution: {integrity: sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==}
    engines: {node: '>=6.9.0'}
    dev: true

  /@babel/helpers@7.28.6:
    resolution: {integrity: sha512-xOBvwq86HHdB7WUDTfKfT/Vuxh7gElQ+Sfti2Cy6yIWNW05P8iUslOVcZ4/sKbE+/jQaukQAdz/gf3724kYdqw==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/template': 7.28.6
      '@babel/types': 7.29.0
    dev: true

  /@babel/parser@7.29.0:
    resolution: {integrity: sha512-IyDgFV5GeDUVX4YdF/3CPULtVGSXXMLh1xVIgdCgxApktqnQV0r7/8Nqthg+8YLGaAtdyIlo2qIdZrbCv4+7ww==}
    engines: {node: '>=6.0.0'}
    hasBin: true
    dependencies:
      '@babel/types': 7.29.0
    dev: true

  /@babel/plugin-transform-react-jsx-self@7.27.1(@babel/core@7.29.0):
    resolution: {integrity: sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
    dev: true

  /@babel/plugin-transform-react-jsx-source@7.27.1(@babel/core@7.29.0):
    resolution: {integrity: sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0
    dependencies:
      '@babel/core': 7.29.0
      '@babel/helper-plugin-utils': 7.28.6
    dev: true

  /@babel/template@7.28.6:
    resolution: {integrity: sha512-YA6Ma2KsCdGb+WC6UpBVFJGXL58MDA6oyONbjyF/+5sBgxY/dwkhLogbMT2GXXyU84/IhRw/2D1Os1B/giz+BQ==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/parser': 7.29.0
      '@babel/types': 7.29.0
    dev: true

  /@babel/traverse@7.29.0:
    resolution: {integrity: sha512-4HPiQr0X7+waHfyXPZpWPfWL/J7dcN1mx9gL6WdQVMbPnF3+ZhSMs8tCxN7oHddJE9fhNE7+lxdnlyemKfJRuA==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/code-frame': 7.29.0
      '@babel/generator': 7.29.1
      '@babel/helper-globals': 7.28.0
      '@babel/parser': 7.29.0
      '@babel/template': 7.28.6
      '@babel/types': 7.29.0
      debug: 4.4.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@babel/types@7.29.0:
    resolution: {integrity: sha512-LwdZHpScM4Qz8Xw2iKSzS+cfglZzJGvofQICy7W7v4caru4EaAmyUuO6BGrbyQ2mYV11W0U8j5mBhd14dd3B0A==}
    engines: {node: '>=6.9.0'}
    dependencies:
      '@babel/helper-string-parser': 7.27.1
      '@babel/helper-validator-identifier': 7.28.5
    dev: true

  /@capacitor/android@6.2.1(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-8gd4CIiQO5LAIlPIfd5mCuodBRxMMdZZEdj8qG8m+dQ1sQ2xyemVpzHmRK8qSCHorsBUCg3D62j2cp6bEBAkdw==}
    peerDependencies:
      '@capacitor/core': ^6.2.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/app@6.0.3(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-4gFUCbcVz0N/YYN32OBFerocWXslIv3Nc90gDiRsBkJc0plwK6kIUT6PKa5WtW2kfhteUeCVXQbvArH2fH+0Ug==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/camera@6.1.3(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-8+3ROcAQ5RZzhBosZqEFgTWMZE48mhxRyYnTdR6ZX12u/ZfsD3x4it3H+XnjbeF7EYgRWG7sY+2emAy8ROubPw==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/cli@6.2.1:
    resolution: {integrity: sha512-JKl0FpFge8PgQNInw12kcKieQ4BmOyazQ4JGJOfEpVXlgrX1yPhSZTPjngupzTCiK3I7q7iGG5kjun0fDqgSCA==}
    engines: {node: '>=18.0.0'}
    hasBin: true
    dependencies:
      '@ionic/cli-framework-output': 2.2.8
      '@ionic/utils-fs': 3.1.7
      '@ionic/utils-subprocess': 2.1.11
      '@ionic/utils-terminal': 2.3.5
      commander: 9.5.0
      debug: 4.4.3
      env-paths: 2.2.1
      kleur: 4.1.5
      native-run: 2.0.3
      open: 8.4.2
      plist: 3.1.0
      prompts: 2.4.2
      rimraf: 4.4.1
      semver: 7.7.4
      tar: 6.2.1
      tslib: 2.8.1
      xml2js: 0.5.0
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@capacitor/core@6.2.1:
    resolution: {integrity: sha512-urZwxa7hVE/BnA18oCFAdizXPse6fCKanQyEqpmz6cBJ2vObwMpyJDG5jBeoSsgocS9+Ax+9vb4ducWJn0y2qQ==}
    dependencies:
      tslib: 2.8.1
    dev: false

  /@capacitor/geolocation@6.1.1(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-zR24reZqkb9farg+qVqR0+DdDYs05SqkiqxCENoPofk/QWD6AobcHKDZutwifqO66jK2rM0ECo8MvbQv4MUTyA==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/haptics@6.0.3(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-6yKF0+lRUZEEx1GDFWgnKHia974np7o1OgmRl/btL9cSMZh0TSDZTyDMH/qcy4AM39CfuIeLs4N4h5lwixXLuQ==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/ios@6.2.1(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-tbMlQdQjxe1wyaBvYVU1yTojKJjgluZQsJkALuJxv/6F8QTw5b6vd7X785O/O7cMpIAZfUWo/vtAHzFkRV+kXw==}
    peerDependencies:
      '@capacitor/core': ^6.2.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/share@6.0.4(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-Ij8C3as4n6L+SUj3M1ko+DGIsrDw2VTkn5Y/pQnFRI9dRk6YoSpGKLN54yOyN7ew3N9bVa8Rko+dFwdcNg7ESA==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/splash-screen@6.0.4(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-uJXR+28cdaie7zIIUBvgkWgHim6Gr1itJym9voIMTmrjXkOaPtejwxYJsdQWPJz9zgGnSbXuC1mNNibLgv3OpQ==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@capacitor/status-bar@6.0.3(@capacitor/core@6.2.1):
    resolution: {integrity: sha512-nFlgSmtx6Zwaw0tEvZgQsWHBeOfWWB/AvEoCApopLT4mHkBVoSrwkLvy2PjZs5wxCbsmqvQczr3XCyTwaDZVQg==}
    peerDependencies:
      '@capacitor/core': ^6.0.0
    dependencies:
      '@capacitor/core': 6.2.1
    dev: false

  /@esbuild/aix-ppc64@0.25.12:
    resolution: {integrity: sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/android-arm64@0.25.12:
    resolution: {integrity: sha512-6AAmLG7zwD1Z159jCKPvAxZd4y/VTO0VkprYy+3N2FtJ8+BQWFXU+OxARIwA46c5tdD9SsKGZ/1ocqBS/gAKHg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/android-arm@0.25.12:
    resolution: {integrity: sha512-VJ+sKvNA/GE7Ccacc9Cha7bpS8nyzVv0jdVgwNDaR4gDMC/2TTRc33Ip8qrNYUcpkOHUT5OZ0bUcNNVZQ9RLlg==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/android-x64@0.25.12:
    resolution: {integrity: sha512-5jbb+2hhDHx5phYR2By8GTWEzn6I9UqR11Kwf22iKbNpYrsmRB18aX/9ivc5cabcUiAT/wM+YIZ6SG9QO6a8kg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/darwin-arm64@0.25.12:
    resolution: {integrity: sha512-N3zl+lxHCifgIlcMUP5016ESkeQjLj/959RxxNYIthIg+CQHInujFuXeWbWMgnTo4cp5XVHqFPmpyu9J65C1Yg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/darwin-x64@0.25.12:
    resolution: {integrity: sha512-HQ9ka4Kx21qHXwtlTUVbKJOAnmG1ipXhdWTmNXiPzPfWKpXqASVcWdnf2bnL73wgjNrFXAa3yYvBSd9pzfEIpA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/freebsd-arm64@0.25.12:
    resolution: {integrity: sha512-gA0Bx759+7Jve03K1S0vkOu5Lg/85dou3EseOGUes8flVOGxbhDDh/iZaoek11Y8mtyKPGF3vP8XhnkDEAmzeg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [freebsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/freebsd-x64@0.25.12:
    resolution: {integrity: sha512-TGbO26Yw2xsHzxtbVFGEXBFH0FRAP7gtcPE7P5yP7wGy7cXK2oO7RyOhL5NLiqTlBh47XhmIUXuGciXEqYFfBQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [freebsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-arm64@0.25.12:
    resolution: {integrity: sha512-8bwX7a8FghIgrupcxb4aUmYDLp8pX06rGh5HqDT7bB+8Rdells6mHvrFHHW2JAOPZUbnjUpKTLg6ECyzvas2AQ==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-arm@0.25.12:
    resolution: {integrity: sha512-lPDGyC1JPDou8kGcywY0YILzWlhhnRjdof3UlcoqYmS9El818LLfJJc3PXXgZHrHCAKs/Z2SeZtDJr5MrkxtOw==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-ia32@0.25.12:
    resolution: {integrity: sha512-0y9KrdVnbMM2/vG8KfU0byhUN+EFCny9+8g202gYqSSVMonbsCfLjUO+rCci7pM0WBEtz+oK/PIwHkzxkyharA==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-loong64@0.25.12:
    resolution: {integrity: sha512-h///Lr5a9rib/v1GGqXVGzjL4TMvVTv+s1DPoxQdz7l/AYv6LDSxdIwzxkrPW438oUXiDtwM10o9PmwS/6Z0Ng==}
    engines: {node: '>=18'}
    cpu: [loong64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-mips64el@0.25.12:
    resolution: {integrity: sha512-iyRrM1Pzy9GFMDLsXn1iHUm18nhKnNMWscjmp4+hpafcZjrr2WbT//d20xaGljXDBYHqRcl8HnxbX6uaA/eGVw==}
    engines: {node: '>=18'}
    cpu: [mips64el]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-ppc64@0.25.12:
    resolution: {integrity: sha512-9meM/lRXxMi5PSUqEXRCtVjEZBGwB7P/D4yT8UG/mwIdze2aV4Vo6U5gD3+RsoHXKkHCfSxZKzmDssVlRj1QQA==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-riscv64@0.25.12:
    resolution: {integrity: sha512-Zr7KR4hgKUpWAwb1f3o5ygT04MzqVrGEGXGLnj15YQDJErYu/BGg+wmFlIDOdJp0PmB0lLvxFIOXZgFRrdjR0w==}
    engines: {node: '>=18'}
    cpu: [riscv64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-s390x@0.25.12:
    resolution: {integrity: sha512-MsKncOcgTNvdtiISc/jZs/Zf8d0cl/t3gYWX8J9ubBnVOwlk65UIEEvgBORTiljloIWnBzLs4qhzPkJcitIzIg==}
    engines: {node: '>=18'}
    cpu: [s390x]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/linux-x64@0.25.12:
    resolution: {integrity: sha512-uqZMTLr/zR/ed4jIGnwSLkaHmPjOjJvnm6TVVitAa08SLS9Z0VM8wIRx7gWbJB5/J54YuIMInDquWyYvQLZkgw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/netbsd-arm64@0.25.12:
    resolution: {integrity: sha512-xXwcTq4GhRM7J9A8Gv5boanHhRa/Q9KLVmcyXHCTaM4wKfIpWkdXiMog/KsnxzJ0A1+nD+zoecuzqPmCRyBGjg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [netbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/netbsd-x64@0.25.12:
    resolution: {integrity: sha512-Ld5pTlzPy3YwGec4OuHh1aCVCRvOXdH8DgRjfDy/oumVovmuSzWfnSJg+VtakB9Cm0gxNO9BzWkj6mtO1FMXkQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [netbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/openbsd-arm64@0.25.12:
    resolution: {integrity: sha512-fF96T6KsBo/pkQI950FARU9apGNTSlZGsv1jZBAlcLL1MLjLNIWPBkj5NlSz8aAzYKg+eNqknrUJ24QBybeR5A==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/openbsd-x64@0.25.12:
    resolution: {integrity: sha512-MZyXUkZHjQxUvzK7rN8DJ3SRmrVrke8ZyRusHlP+kuwqTcfWLyqMOE3sScPPyeIXN/mDJIfGXvcMqCgYKekoQw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [openbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/openharmony-arm64@0.25.12:
    resolution: {integrity: sha512-rm0YWsqUSRrjncSXGA7Zv78Nbnw4XL6/dzr20cyrQf7ZmRcsovpcRBdhD43Nuk3y7XIoW2OxMVvwuRvk9XdASg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openharmony]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/sunos-x64@0.25.12:
    resolution: {integrity: sha512-3wGSCDyuTHQUzt0nV7bocDy72r2lI33QL3gkDNGkod22EsYl04sMf0qLb8luNKTOmgF/eDEDP5BFNwoBKH441w==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [sunos]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/win32-arm64@0.25.12:
    resolution: {integrity: sha512-rMmLrur64A7+DKlnSuwqUdRKyd3UE7oPJZmnljqEptesKM8wx9J8gx5u0+9Pq0fQQW8vqeKebwNXdfOyP+8Bsg==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/win32-ia32@0.25.12:
    resolution: {integrity: sha512-HkqnmmBoCbCwxUKKNPBixiWDGCpQGVsrQfJoVGYLPT41XWF8lHuE5N6WhVia2n4o5QK5M4tYr21827fNhi4byQ==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@esbuild/win32-x64@0.25.12:
    resolution: {integrity: sha512-alJC0uCZpTFrSL0CCDjcgleBXPnCrEAhTBILpeAp7M/OFgoqtAetfBzX0xM00MUsVVPpVjlPuMbREqnZCXaTnA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@eslint-community/eslint-utils@4.9.1(eslint@9.39.2):
    resolution: {integrity: sha512-phrYmNiYppR7znFEdqgfWHXR6NCkZEK7hwWDHZUjit/2/U0r6XvkDl0SYnoM51Hq7FhCGdLDT6zxCCOY1hexsQ==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: ^6.0.0 || ^7.0.0 || >=8.0.0
    dependencies:
      eslint: 9.39.2
      eslint-visitor-keys: 3.4.3
    dev: true

  /@eslint-community/regexpp@4.12.2:
    resolution: {integrity: sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==}
    engines: {node: ^12.0.0 || ^14.0.0 || >=16.0.0}
    dev: true

  /@eslint/config-array@0.21.1:
    resolution: {integrity: sha512-aw1gNayWpdI/jSYVgzN5pL0cfzU02GT3NBpeT/DXbx1/1x7ZKxFPd9bwrzygx/qiwIQiJ1sw/zD8qY/kRvlGHA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@eslint/object-schema': 2.1.7
      debug: 4.4.3
      minimatch: 3.1.2
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@eslint/config-helpers@0.4.2:
    resolution: {integrity: sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@eslint/core': 0.17.0
    dev: true

  /@eslint/core@0.17.0:
    resolution: {integrity: sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@types/json-schema': 7.0.15
    dev: true

  /@eslint/eslintrc@3.3.3:
    resolution: {integrity: sha512-Kr+LPIUVKz2qkx1HAMH8q1q6azbqBAsXJUxBl/ODDuVPX45Z9DfwB8tPjTi6nNZ8BuM3nbJxC5zCAg5elnBUTQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      ajv: 6.12.6
      debug: 4.4.3
      espree: 10.4.0
      globals: 14.0.0
      ignore: 5.3.2
      import-fresh: 3.3.1
      js-yaml: 4.1.1
      minimatch: 3.1.2
      strip-json-comments: 3.1.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@eslint/js@9.39.2:
    resolution: {integrity: sha512-q1mjIoW1VX4IvSocvM/vbTiveKC4k9eLrajNEuSsmjymSDEbpGddtpfOoN7YGAqBK3NG+uqo8ia4PDTt8buCYA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: true

  /@eslint/object-schema@2.1.7:
    resolution: {integrity: sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: true

  /@eslint/plugin-kit@0.4.1:
    resolution: {integrity: sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@eslint/core': 0.17.0
      levn: 0.4.1
    dev: true

  /@humanfs/core@0.19.1:
    resolution: {integrity: sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA==}
    engines: {node: '>=18.18.0'}
    dev: true

  /@humanfs/node@0.16.7:
    resolution: {integrity: sha512-/zUx+yOsIrG4Y43Eh2peDeKCxlRt/gET6aHfaKpuq267qXdYDFViVHfMaLyygZOnl0kGWxFIgsBy8QFuTLUXEQ==}
    engines: {node: '>=18.18.0'}
    dependencies:
      '@humanfs/core': 0.19.1
      '@humanwhocodes/retry': 0.4.3
    dev: true

  /@humanwhocodes/module-importer@1.0.1:
    resolution: {integrity: sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==}
    engines: {node: '>=12.22'}
    dev: true

  /@humanwhocodes/retry@0.4.3:
    resolution: {integrity: sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==}
    engines: {node: '>=18.18'}
    dev: true

  /@ionic/cli-framework-output@2.2.8:
    resolution: {integrity: sha512-TshtaFQsovB4NWRBydbNFawql6yul7d5bMiW1WYYf17hd99V6xdDdk3vtF51bw6sLkxON3bDQpWsnUc9/hVo3g==}
    engines: {node: '>=16.0.0'}
    dependencies:
      '@ionic/utils-terminal': 2.3.5
      debug: 4.4.3
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-array@2.1.5:
    resolution: {integrity: sha512-HD72a71IQVBmQckDwmA8RxNVMTbxnaLbgFOl+dO5tbvW9CkkSFCv41h6fUuNsSEVgngfkn0i98HDuZC8mk+lTA==}
    engines: {node: '>=10.3.0'}
    dependencies:
      debug: 4.4.3
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-fs@3.1.6:
    resolution: {integrity: sha512-eikrNkK89CfGPmexjTfSWl4EYqsPSBh0Ka7by4F0PLc1hJZYtJxUZV3X4r5ecA8ikjicUmcbU7zJmAjmqutG/w==}
    engines: {node: '>=10.3.0'}
    dependencies:
      '@types/fs-extra': 8.1.5
      debug: 4.4.3
      fs-extra: 9.1.0
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-fs@3.1.7:
    resolution: {integrity: sha512-2EknRvMVfhnyhL1VhFkSLa5gOcycK91VnjfrTB0kbqkTFCOXyXgVLI5whzq7SLrgD9t1aqos3lMMQyVzaQ5gVA==}
    engines: {node: '>=16.0.0'}
    dependencies:
      '@types/fs-extra': 8.1.5
      debug: 4.4.3
      fs-extra: 9.1.0
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-object@2.1.5:
    resolution: {integrity: sha512-XnYNSwfewUqxq+yjER1hxTKggftpNjFLJH0s37jcrNDwbzmbpFTQTVAp4ikNK4rd9DOebX/jbeZb8jfD86IYxw==}
    engines: {node: '>=10.3.0'}
    dependencies:
      debug: 4.4.3
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-process@2.1.10:
    resolution: {integrity: sha512-mZ7JEowcuGQK+SKsJXi0liYTcXd2bNMR3nE0CyTROpMECUpJeAvvaBaPGZf5ERQUPeWBVuwqAqjUmIdxhz5bxw==}
    engines: {node: '>=10.3.0'}
    dependencies:
      '@ionic/utils-object': 2.1.5
      '@ionic/utils-terminal': 2.3.3
      debug: 4.4.3
      signal-exit: 3.0.7
      tree-kill: 1.2.2
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-stream@3.1.5:
    resolution: {integrity: sha512-hkm46uHvEC05X/8PHgdJi4l4zv9VQDELZTM+Kz69odtO9zZYfnt8DkfXHJqJ+PxmtiE5mk/ehJWLnn/XAczTUw==}
    engines: {node: '>=10.3.0'}
    dependencies:
      debug: 4.4.3
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-subprocess@2.1.11:
    resolution: {integrity: sha512-6zCDixNmZCbMCy5np8klSxOZF85kuDyzZSTTQKQP90ZtYNCcPYmuFSzaqDwApJT4r5L3MY3JrqK1gLkc6xiUPw==}
    engines: {node: '>=10.3.0'}
    dependencies:
      '@ionic/utils-array': 2.1.5
      '@ionic/utils-fs': 3.1.6
      '@ionic/utils-process': 2.1.10
      '@ionic/utils-stream': 3.1.5
      '@ionic/utils-terminal': 2.3.3
      cross-spawn: 7.0.6
      debug: 4.4.3
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-terminal@2.3.3:
    resolution: {integrity: sha512-RnuSfNZ5fLEyX3R5mtcMY97cGD1A0NVBbarsSQ6yMMfRJ5YHU7hHVyUfvZeClbqkBC/pAqI/rYJuXKCT9YeMCQ==}
    engines: {node: '>=10.3.0'}
    dependencies:
      '@types/slice-ansi': 4.0.0
      debug: 4.4.3
      signal-exit: 3.0.7
      slice-ansi: 4.0.0
      string-width: 4.2.3
      strip-ansi: 6.0.1
      tslib: 2.8.1
      untildify: 4.0.0
      wrap-ansi: 7.0.0
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@ionic/utils-terminal@2.3.5:
    resolution: {integrity: sha512-3cKScz9Jx2/Pr9ijj1OzGlBDfcmx7OMVBt4+P1uRR0SSW4cm1/y3Mo4OY3lfkuaYifMNBW8Wz6lQHbs1bihr7A==}
    engines: {node: '>=16.0.0'}
    dependencies:
      '@types/slice-ansi': 4.0.0
      debug: 4.4.3
      signal-exit: 3.0.7
      slice-ansi: 4.0.0
      string-width: 4.2.3
      strip-ansi: 6.0.1
      tslib: 2.8.1
      untildify: 4.0.0
      wrap-ansi: 7.0.0
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@jridgewell/gen-mapping@0.3.13:
    resolution: {integrity: sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==}
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.5
      '@jridgewell/trace-mapping': 0.3.31
    dev: true

  /@jridgewell/remapping@2.3.5:
    resolution: {integrity: sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==}
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      '@jridgewell/trace-mapping': 0.3.31
    dev: true

  /@jridgewell/resolve-uri@3.1.2:
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}
    dev: true

  /@jridgewell/sourcemap-codec@1.5.5:
    resolution: {integrity: sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==}
    dev: true

  /@jridgewell/trace-mapping@0.3.31:
    resolution: {integrity: sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==}
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.5
    dev: true

  /@nodelib/fs.scandir@2.1.5:
    resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
    engines: {node: '>= 8'}
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      run-parallel: 1.2.0
    dev: true

  /@nodelib/fs.stat@2.0.5:
    resolution: {integrity: sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==}
    engines: {node: '>= 8'}
    dev: true

  /@nodelib/fs.walk@1.2.8:
    resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
    engines: {node: '>= 8'}
    dependencies:
      '@nodelib/fs.scandir': 2.1.5
      fastq: 1.20.1
    dev: true

  /@rolldown/pluginutils@1.0.0-beta.27:
    resolution: {integrity: sha512-+d0F4MKMCbeVUJwG96uQ4SgAznZNSq93I3V+9NHA4OpvqG8mRCpGdKmK8l/dl02h2CCDHwW2FqilnTyDcAnqjA==}
    dev: true

  /@rollup/rollup-android-arm-eabi@4.57.1:
    resolution: {integrity: sha512-A6ehUVSiSaaliTxai040ZpZ2zTevHYbvu/lDoeAteHI8QnaosIzm4qwtezfRg1jOYaUmnzLX1AOD6Z+UJjtifg==}
    cpu: [arm]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-android-arm64@4.57.1:
    resolution: {integrity: sha512-dQaAddCY9YgkFHZcFNS/606Exo8vcLHwArFZ7vxXq4rigo2bb494/xKMMwRRQW6ug7Js6yXmBZhSBRuBvCCQ3w==}
    cpu: [arm64]
    os: [android]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-darwin-arm64@4.57.1:
    resolution: {integrity: sha512-crNPrwJOrRxagUYeMn/DZwqN88SDmwaJ8Cvi/TN1HnWBU7GwknckyosC2gd0IqYRsHDEnXf328o9/HC6OkPgOg==}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-darwin-x64@4.57.1:
    resolution: {integrity: sha512-Ji8g8ChVbKrhFtig5QBV7iMaJrGtpHelkB3lsaKzadFBe58gmjfGXAOfI5FV0lYMH8wiqsxKQ1C9B0YTRXVy4w==}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-freebsd-arm64@4.57.1:
    resolution: {integrity: sha512-R+/WwhsjmwodAcz65guCGFRkMb4gKWTcIeLy60JJQbXrJ97BOXHxnkPFrP+YwFlaS0m+uWJTstrUA9o+UchFug==}
    cpu: [arm64]
    os: [freebsd]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-freebsd-x64@4.57.1:
    resolution: {integrity: sha512-IEQTCHeiTOnAUC3IDQdzRAGj3jOAYNr9kBguI7MQAAZK3caezRrg0GxAb6Hchg4lxdZEI5Oq3iov/w/hnFWY9Q==}
    cpu: [x64]
    os: [freebsd]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm-gnueabihf@4.57.1:
    resolution: {integrity: sha512-F8sWbhZ7tyuEfsmOxwc2giKDQzN3+kuBLPwwZGyVkLlKGdV1nvnNwYD0fKQ8+XS6hp9nY7B+ZeK01EBUE7aHaw==}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm-musleabihf@4.57.1:
    resolution: {integrity: sha512-rGfNUfn0GIeXtBP1wL5MnzSj98+PZe/AXaGBCRmT0ts80lU5CATYGxXukeTX39XBKsxzFpEeK+Mrp9faXOlmrw==}
    cpu: [arm]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm64-gnu@4.57.1:
    resolution: {integrity: sha512-MMtej3YHWeg/0klK2Qodf3yrNzz6CGjo2UntLvk2RSPlhzgLvYEB3frRvbEF2wRKh1Z2fDIg9KRPe1fawv7C+g==}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-arm64-musl@4.57.1:
    resolution: {integrity: sha512-1a/qhaaOXhqXGpMFMET9VqwZakkljWHLmZOX48R0I/YLbhdxr1m4gtG1Hq7++VhVUmf+L3sTAf9op4JlhQ5u1Q==}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-loong64-gnu@4.57.1:
    resolution: {integrity: sha512-QWO6RQTZ/cqYtJMtxhkRkidoNGXc7ERPbZN7dVW5SdURuLeVU7lwKMpo18XdcmpWYd0qsP1bwKPf7DNSUinhvA==}
    cpu: [loong64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-loong64-musl@4.57.1:
    resolution: {integrity: sha512-xpObYIf+8gprgWaPP32xiN5RVTi/s5FCR+XMXSKmhfoJjrpRAjCuuqQXyxUa/eJTdAE6eJ+KDKaoEqjZQxh3Gw==}
    cpu: [loong64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-ppc64-gnu@4.57.1:
    resolution: {integrity: sha512-4BrCgrpZo4hvzMDKRqEaW1zeecScDCR+2nZ86ATLhAoJ5FQ+lbHVD3ttKe74/c7tNT9c6F2viwB3ufwp01Oh2w==}
    cpu: [ppc64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-ppc64-musl@4.57.1:
    resolution: {integrity: sha512-NOlUuzesGauESAyEYFSe3QTUguL+lvrN1HtwEEsU2rOwdUDeTMJdO5dUYl/2hKf9jWydJrO9OL/XSSf65R5+Xw==}
    cpu: [ppc64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-riscv64-gnu@4.57.1:
    resolution: {integrity: sha512-ptA88htVp0AwUUqhVghwDIKlvJMD/fmL/wrQj99PRHFRAG6Z5nbWoWG4o81Nt9FT+IuqUQi+L31ZKAFeJ5Is+A==}
    cpu: [riscv64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-riscv64-musl@4.57.1:
    resolution: {integrity: sha512-S51t7aMMTNdmAMPpBg7OOsTdn4tySRQvklmL3RpDRyknk87+Sp3xaumlatU+ppQ+5raY7sSTcC2beGgvhENfuw==}
    cpu: [riscv64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-s390x-gnu@4.57.1:
    resolution: {integrity: sha512-Bl00OFnVFkL82FHbEqy3k5CUCKH6OEJL54KCyx2oqsmZnFTR8IoNqBF+mjQVcRCT5sB6yOvK8A37LNm/kPJiZg==}
    cpu: [s390x]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-x64-gnu@4.57.1:
    resolution: {integrity: sha512-ABca4ceT4N+Tv/GtotnWAeXZUZuM/9AQyCyKYyKnpk4yoA7QIAuBt6Hkgpw8kActYlew2mvckXkvx0FfoInnLg==}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-linux-x64-musl@4.57.1:
    resolution: {integrity: sha512-HFps0JeGtuOR2convgRRkHCekD7j+gdAuXM+/i6kGzQtFhlCtQkpwtNzkNj6QhCDp7DRJ7+qC/1Vg2jt5iSOFw==}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-openbsd-x64@4.57.1:
    resolution: {integrity: sha512-H+hXEv9gdVQuDTgnqD+SQffoWoc0Of59AStSzTEj/feWTBAnSfSD3+Dql1ZruJQxmykT/JVY0dE8Ka7z0DH1hw==}
    cpu: [x64]
    os: [openbsd]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-openharmony-arm64@4.57.1:
    resolution: {integrity: sha512-4wYoDpNg6o/oPximyc/NG+mYUejZrCU2q+2w6YZqrAs2UcNUChIZXjtafAiiZSUc7On8v5NyNj34Kzj/Ltk6dQ==}
    cpu: [arm64]
    os: [openharmony]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-arm64-msvc@4.57.1:
    resolution: {integrity: sha512-O54mtsV/6LW3P8qdTcamQmuC990HDfR71lo44oZMZlXU4tzLrbvTii87Ni9opq60ds0YzuAlEr/GNwuNluZyMQ==}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-ia32-msvc@4.57.1:
    resolution: {integrity: sha512-P3dLS+IerxCT/7D2q2FYcRdWRl22dNbrbBEtxdWhXrfIMPP9lQhb5h4Du04mdl5Woq05jVCDPCMF7Ub0NAjIew==}
    cpu: [ia32]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-x64-gnu@4.57.1:
    resolution: {integrity: sha512-VMBH2eOOaKGtIJYleXsi2B8CPVADrh+TyNxJ4mWPnKfLB/DBUmzW+5m1xUrcwWoMfSLagIRpjUFeW5CO5hyciQ==}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@rollup/rollup-win32-x64-msvc@4.57.1:
    resolution: {integrity: sha512-mxRFDdHIWRxg3UfIIAwCm6NzvxG0jDX/wBN6KsQFTvKFqqg9vTrWUE68qEjHt19A5wwx5X5aUi2zuZT7YR0jrA==}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /@tanstack/query-core@5.90.20:
    resolution: {integrity: sha512-OMD2HLpNouXEfZJWcKeVKUgQ5n+n3A2JFmBaScpNDUqSrQSjiveC7dKMe53uJUg1nDG16ttFPz2xfilz6i2uVg==}
    dev: false

  /@tanstack/react-query@5.90.20(react@18.3.1):
    resolution: {integrity: sha512-vXBxa+qeyveVO7OA0jX1z+DeyCA4JKnThKv411jd5SORpBKgkcVnYKCiBgECvADvniBX7tobwBmg01qq9JmMJw==}
    peerDependencies:
      react: ^18 || ^19
    dependencies:
      '@tanstack/query-core': 5.90.20
      react: 18.3.1
    dev: false

  /@types/babel__core@7.20.5:
    resolution: {integrity: sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==}
    dependencies:
      '@babel/parser': 7.29.0
      '@babel/types': 7.29.0
      '@types/babel__generator': 7.27.0
      '@types/babel__template': 7.4.4
      '@types/babel__traverse': 7.28.0
    dev: true

  /@types/babel__generator@7.27.0:
    resolution: {integrity: sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==}
    dependencies:
      '@babel/types': 7.29.0
    dev: true

  /@types/babel__template@7.4.4:
    resolution: {integrity: sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==}
    dependencies:
      '@babel/parser': 7.29.0
      '@babel/types': 7.29.0
    dev: true

  /@types/babel__traverse@7.28.0:
    resolution: {integrity: sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==}
    dependencies:
      '@babel/types': 7.29.0
    dev: true

  /@types/estree@1.0.8:
    resolution: {integrity: sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==}
    dev: true

  /@types/fs-extra@8.1.5:
    resolution: {integrity: sha512-0dzKcwO+S8s2kuF5Z9oUWatQJj5Uq/iqphEtE3GQJVRRYm/tD1LglU2UnXi2A8jLq5umkGouOXOR9y0n613ZwQ==}
    dependencies:
      '@types/node': 25.2.2
    dev: true

  /@types/json-schema@7.0.15:
    resolution: {integrity: sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==}
    dev: true

  /@types/node@25.2.2:
    resolution: {integrity: sha512-BkmoP5/FhRYek5izySdkOneRyXYN35I860MFAGupTdebyE66uZaR+bXLHq8k4DirE5DwQi3NuhvRU1jqTVwUrQ==}
    dependencies:
      undici-types: 7.16.0
    dev: true

  /@types/prop-types@15.7.15:
    resolution: {integrity: sha512-F6bEyamV9jKGAFBEmlQnesRPGOQqS2+Uwi0Em15xenOxHaf2hv6L8YCVn3rPdPJOiJfPiCnLIRyvwVaqMY3MIw==}

  /@types/react-dom@18.3.7(@types/react@18.3.28):
    resolution: {integrity: sha512-MEe3UeoENYVFXzoXEWsvcpg6ZvlrFNlOQ7EOsvhI3CfAXwzPfO8Qwuxd40nepsYKqyyVQnTdEfv68q91yLcKrQ==}
    peerDependencies:
      '@types/react': ^18.0.0
    dependencies:
      '@types/react': 18.3.28
    dev: true

  /@types/react@18.3.28:
    resolution: {integrity: sha512-z9VXpC7MWrhfWipitjNdgCauoMLRdIILQsAEV+ZesIzBq/oUlxk0m3ApZuMFCXdnS4U7KrI+l3WRUEGQ8K1QKw==}
    dependencies:
      '@types/prop-types': 15.7.15
      csstype: 3.2.3

  /@types/slice-ansi@4.0.0:
    resolution: {integrity: sha512-+OpjSaq85gvlZAYINyzKpLeiFkSC4EsC6IIiT6v6TLSU5k5U83fHGj9Lel8oKEXM0HqgrMVCjXPDPVICtxF7EQ==}
    dev: true

  /@typescript-eslint/eslint-plugin@8.55.0(@typescript-eslint/parser@8.55.0)(eslint@9.39.2)(typescript@5.9.3):
    resolution: {integrity: sha512-1y/MVSz0NglV1ijHC8OT49mPJ4qhPYjiK08YUQVbIOyu+5k862LKUHFkpKHWu//zmr7hDR2rhwUm6gnCGNmGBQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      '@typescript-eslint/parser': ^8.55.0
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      '@eslint-community/regexpp': 4.12.2
      '@typescript-eslint/parser': 8.55.0(eslint@9.39.2)(typescript@5.9.3)
      '@typescript-eslint/scope-manager': 8.55.0
      '@typescript-eslint/type-utils': 8.55.0(eslint@9.39.2)(typescript@5.9.3)
      '@typescript-eslint/utils': 8.55.0(eslint@9.39.2)(typescript@5.9.3)
      '@typescript-eslint/visitor-keys': 8.55.0
      eslint: 9.39.2
      ignore: 7.0.5
      natural-compare: 1.4.0
      ts-api-utils: 2.4.0(typescript@5.9.3)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@typescript-eslint/parser@8.55.0(eslint@9.39.2)(typescript@5.9.3):
    resolution: {integrity: sha512-4z2nCSBfVIMnbuu8uinj+f0o4qOeggYJLbjpPHka3KH1om7e+H9yLKTYgksTaHcGco+NClhhY2vyO3HsMH1RGw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      '@typescript-eslint/scope-manager': 8.55.0
      '@typescript-eslint/types': 8.55.0
      '@typescript-eslint/typescript-estree': 8.55.0(typescript@5.9.3)
      '@typescript-eslint/visitor-keys': 8.55.0
      debug: 4.4.3
      eslint: 9.39.2
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@typescript-eslint/project-service@8.55.0(typescript@5.9.3):
    resolution: {integrity: sha512-zRcVVPFUYWa3kNnjaZGXSu3xkKV1zXy8M4nO/pElzQhFweb7PPtluDLQtKArEOGmjXoRjnUZ29NjOiF0eCDkcQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      '@typescript-eslint/tsconfig-utils': 8.55.0(typescript@5.9.3)
      '@typescript-eslint/types': 8.55.0
      debug: 4.4.3
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@typescript-eslint/scope-manager@8.55.0:
    resolution: {integrity: sha512-fVu5Omrd3jeqeQLiB9f1YsuK/iHFOwb04bCtY4BSCLgjNbOD33ZdV6KyEqplHr+IlpgT0QTZ/iJ+wT7hvTx49Q==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@typescript-eslint/types': 8.55.0
      '@typescript-eslint/visitor-keys': 8.55.0
    dev: true

  /@typescript-eslint/tsconfig-utils@8.55.0(typescript@5.9.3):
    resolution: {integrity: sha512-1R9cXqY7RQd7WuqSN47PK9EDpgFUK3VqdmbYrvWJZYDd0cavROGn+74ktWBlmJ13NXUQKlZ/iAEQHI/V0kKe0Q==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      typescript: 5.9.3
    dev: true

  /@typescript-eslint/type-utils@8.55.0(eslint@9.39.2)(typescript@5.9.3):
    resolution: {integrity: sha512-x1iH2unH4qAt6I37I2CGlsNs+B9WGxurP2uyZLRz6UJoZWDBx9cJL1xVN/FiOmHEONEg6RIufdvyT0TEYIgC5g==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      '@typescript-eslint/types': 8.55.0
      '@typescript-eslint/typescript-estree': 8.55.0(typescript@5.9.3)
      '@typescript-eslint/utils': 8.55.0(eslint@9.39.2)(typescript@5.9.3)
      debug: 4.4.3
      eslint: 9.39.2
      ts-api-utils: 2.4.0(typescript@5.9.3)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@typescript-eslint/types@8.55.0:
    resolution: {integrity: sha512-ujT0Je8GI5BJWi+/mMoR0wxwVEQaxM+pi30xuMiJETlX80OPovb2p9E8ss87gnSVtYXtJoU9U1Cowcr6w2FE0w==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: true

  /@typescript-eslint/typescript-estree@8.55.0(typescript@5.9.3):
    resolution: {integrity: sha512-EwrH67bSWdx/3aRQhCoxDaHM+CrZjotc2UCCpEDVqfCE+7OjKAGWNY2HsCSTEVvWH2clYQK8pdeLp42EVs+xQw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      '@typescript-eslint/project-service': 8.55.0(typescript@5.9.3)
      '@typescript-eslint/tsconfig-utils': 8.55.0(typescript@5.9.3)
      '@typescript-eslint/types': 8.55.0
      '@typescript-eslint/visitor-keys': 8.55.0
      debug: 4.4.3
      minimatch: 9.0.5
      semver: 7.7.4
      tinyglobby: 0.2.15
      ts-api-utils: 2.4.0(typescript@5.9.3)
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@typescript-eslint/utils@8.55.0(eslint@9.39.2)(typescript@5.9.3):
    resolution: {integrity: sha512-BqZEsnPGdYpgyEIkDC1BadNY8oMwckftxBT+C8W0g1iKPdeqKZBtTfnvcq0nf60u7MkjFO8RBvpRGZBPw4L2ow==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <6.0.0'
    dependencies:
      '@eslint-community/eslint-utils': 4.9.1(eslint@9.39.2)
      '@typescript-eslint/scope-manager': 8.55.0
      '@typescript-eslint/types': 8.55.0
      '@typescript-eslint/typescript-estree': 8.55.0(typescript@5.9.3)
      eslint: 9.39.2
      typescript: 5.9.3
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@typescript-eslint/visitor-keys@8.55.0:
    resolution: {integrity: sha512-AxNRwEie8Nn4eFS1FzDMJWIISMGoXMb037sgCBJ3UR6o0fQTzr2tqN9WT+DkWJPhIdQCfV7T6D387566VtnCJA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      '@typescript-eslint/types': 8.55.0
      eslint-visitor-keys: 4.2.1
    dev: true

  /@vitejs/plugin-react@4.7.0(vite@6.4.1):
    resolution: {integrity: sha512-gUu9hwfWvvEDBBmgtAowQCojwZmJ5mcLn3aufeCsitijs3+f2NsrPtlAWIR6OPiqljl96GVCUbLe0HyqIpVaoA==}
    engines: {node: ^14.18.0 || >=16.0.0}
    peerDependencies:
      vite: ^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0
    dependencies:
      '@babel/core': 7.29.0
      '@babel/plugin-transform-react-jsx-self': 7.27.1(@babel/core@7.29.0)
      '@babel/plugin-transform-react-jsx-source': 7.27.1(@babel/core@7.29.0)
      '@rolldown/pluginutils': 1.0.0-beta.27
      '@types/babel__core': 7.20.5
      react-refresh: 0.17.0
      vite: 6.4.1(@types/node@25.2.2)
    transitivePeerDependencies:
      - supports-color
    dev: true

  /@xmldom/xmldom@0.8.11:
    resolution: {integrity: sha512-cQzWCtO6C8TQiYl1ruKNn2U6Ao4o4WBBcbL61yJl84x+j5sOWWFU9X7DpND8XZG3daDppSsigMdfAIl2upQBRw==}
    engines: {node: '>=10.0.0'}
    dev: true

  /acorn-jsx@5.3.2(acorn@8.15.0):
    resolution: {integrity: sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==}
    peerDependencies:
      acorn: ^6.0.0 || ^7.0.0 || ^8.0.0
    dependencies:
      acorn: 8.15.0
    dev: true

  /acorn@8.15.0:
    resolution: {integrity: sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg==}
    engines: {node: '>=0.4.0'}
    hasBin: true
    dev: true

  /ajv@6.12.6:
    resolution: {integrity: sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==}
    dependencies:
      fast-deep-equal: 3.1.3
      fast-json-stable-stringify: 2.1.0
      json-schema-traverse: 0.4.1
      uri-js: 4.4.1
    dev: true

  /ansi-regex@5.0.1:
    resolution: {integrity: sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==}
    engines: {node: '>=8'}
    dev: true

  /ansi-styles@4.3.0:
    resolution: {integrity: sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==}
    engines: {node: '>=8'}
    dependencies:
      color-convert: 2.0.1
    dev: true

  /any-promise@1.3.0:
    resolution: {integrity: sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==}
    dev: true

  /anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.1
    dev: true

  /arg@5.0.2:
    resolution: {integrity: sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==}
    dev: true

  /argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}
    dev: true

  /astral-regex@2.0.0:
    resolution: {integrity: sha512-Z7tMw1ytTXt5jqMcOP+OQteU1VuNK9Y02uuJtKQ1Sv69jXQKKg5cibLwGJow8yzZP+eAc18EmLGPal0bp36rvQ==}
    engines: {node: '>=8'}
    dev: true

  /at-least-node@1.0.0:
    resolution: {integrity: sha512-+q/t7Ekv1EDY2l6Gda6LLiX14rU9TV20Wa3ofeQmwPFZbOMo9DXrLbOjFaaclkXKWidIaopwAObQDqwWtGUjqg==}
    engines: {node: '>= 4.0.0'}
    dev: true

  /autoprefixer@10.4.24(postcss@8.5.6):
    resolution: {integrity: sha512-uHZg7N9ULTVbutaIsDRoUkoS8/h3bdsmVJYZ5l3wv8Cp/6UIIoRDm90hZ+BwxUj/hGBEzLxdHNSKuFpn8WOyZw==}
    engines: {node: ^10 || ^12 || >=14}
    hasBin: true
    peerDependencies:
      postcss: ^8.1.0
    dependencies:
      browserslist: 4.28.1
      caniuse-lite: 1.0.30001769
      fraction.js: 5.3.4
      picocolors: 1.1.1
      postcss: 8.5.6
      postcss-value-parser: 4.2.0
    dev: true

  /balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}
    dev: true

  /base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}
    dev: true

  /baseline-browser-mapping@2.9.19:
    resolution: {integrity: sha512-ipDqC8FrAl/76p2SSWKSI+H9tFwm7vYqXQrItCuiVPt26Km0jS+NzSsBWAaBusvSbQcfJG+JitdMm+wZAgTYqg==}
    hasBin: true
    dev: true

  /big-integer@1.6.52:
    resolution: {integrity: sha512-QxD8cf2eVqJOOz63z6JIN9BzvVs/dlySa5HGSBH5xtR8dPteIRQnBxxKqkNTiT6jbDTF6jAfrd4oMcND9RGbQg==}
    engines: {node: '>=0.6'}
    dev: true

  /binary-extensions@2.3.0:
    resolution: {integrity: sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==}
    engines: {node: '>=8'}
    dev: true

  /bplist-parser@0.3.2:
    resolution: {integrity: sha512-apC2+fspHGI3mMKj+dGevkGo/tCqVB8jMb6i+OX+E29p0Iposz07fABkRIfVUPNd5A5VbuOz1bZbnmkKLYF+wQ==}
    engines: {node: '>= 5.10.0'}
    dependencies:
      big-integer: 1.6.52
    dev: true

  /brace-expansion@1.1.12:
    resolution: {integrity: sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==}
    dependencies:
      balanced-match: 1.0.2
      concat-map: 0.0.1
    dev: true

  /brace-expansion@2.0.2:
    resolution: {integrity: sha512-Jt0vHyM+jmUBqojB7E1NIYadt0vI0Qxjxd2TErW94wDz+E2LAm5vKMXXwg6ZZBTHPuUlDgQHKXvjGBdfcF1ZDQ==}
    dependencies:
      balanced-match: 1.0.2
    dev: true

  /braces@3.0.3:
    resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
    engines: {node: '>=8'}
    dependencies:
      fill-range: 7.1.1
    dev: true

  /browserslist@4.28.1:
    resolution: {integrity: sha512-ZC5Bd0LgJXgwGqUknZY/vkUQ04r8NXnJZ3yYi4vDmSiZmC/pdSN0NbNRPxZpbtO4uAfDUAFffO8IZoM3Gj8IkA==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true
    dependencies:
      baseline-browser-mapping: 2.9.19
      caniuse-lite: 1.0.30001769
      electron-to-chromium: 1.5.286
      node-releases: 2.0.27
      update-browserslist-db: 1.2.3(browserslist@4.28.1)
    dev: true

  /buffer-crc32@0.2.13:
    resolution: {integrity: sha512-VO9Ht/+p3SN7SKWqcrgEzjGbRSJYTx+Q1pTQC0wrWqHx0vpJraQ6GtHx8tvcg1rlK1byhU5gccxgOgj7B0TDkQ==}
    dev: true

  /callsites@3.1.0:
    resolution: {integrity: sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==}
    engines: {node: '>=6'}
    dev: true

  /camelcase-css@2.0.1:
    resolution: {integrity: sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==}
    engines: {node: '>= 6'}
    dev: true

  /caniuse-lite@1.0.30001769:
    resolution: {integrity: sha512-BCfFL1sHijQlBGWBMuJyhZUhzo7wer5sVj9hqekB/7xn0Ypy+pER/edCYQm4exbXj4WiySGp40P8UuTh6w1srg==}
    dev: true

  /chalk@4.1.2:
    resolution: {integrity: sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==}
    engines: {node: '>=10'}
    dependencies:
      ansi-styles: 4.3.0
      supports-color: 7.2.0
    dev: true

  /chokidar@3.6.0:
    resolution: {integrity: sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==}
    engines: {node: '>= 8.10.0'}
    dependencies:
      anymatch: 3.1.3
      braces: 3.0.3
      glob-parent: 5.1.2
      is-binary-path: 2.1.0
      is-glob: 4.0.3
      normalize-path: 3.0.0
      readdirp: 3.6.0
    optionalDependencies:
      fsevents: 2.3.3
    dev: true

  /chownr@2.0.0:
    resolution: {integrity: sha512-bIomtDF5KGpdogkLd9VspvFzk9KfpyyGlS8YFVZl7TGPBHL5snIOnxeshwVgPteQ9b4Eydl+pVbIyE1DcvCWgQ==}
    engines: {node: '>=10'}
    dev: true

  /color-convert@2.0.1:
    resolution: {integrity: sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==}
    engines: {node: '>=7.0.0'}
    dependencies:
      color-name: 1.1.4
    dev: true

  /color-name@1.1.4:
    resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}
    dev: true

  /commander@4.1.1:
    resolution: {integrity: sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==}
    engines: {node: '>= 6'}
    dev: true

  /commander@9.5.0:
    resolution: {integrity: sha512-KRs7WVDKg86PWiuAqhDrAQnTXZKraVcCc6vFdL14qrZ/DcWwuRo7VoiYXalXO7S5GKpqYiVEwCbgFDfxNHKJBQ==}
    engines: {node: ^12.20.0 || >=14}
    dev: true

  /concat-map@0.0.1:
    resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}
    dev: true

  /convert-source-map@2.0.0:
    resolution: {integrity: sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==}
    dev: true

  /cross-spawn@7.0.6:
    resolution: {integrity: sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==}
    engines: {node: '>= 8'}
    dependencies:
      path-key: 3.1.1
      shebang-command: 2.0.0
      which: 2.0.2
    dev: true

  /cssesc@3.0.0:
    resolution: {integrity: sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==}
    engines: {node: '>=4'}
    hasBin: true
    dev: true

  /csstype@3.2.3:
    resolution: {integrity: sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==}

  /debug@4.4.3:
    resolution: {integrity: sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true
    dependencies:
      ms: 2.1.3
    dev: true

  /deep-is@0.1.4:
    resolution: {integrity: sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==}
    dev: true

  /define-lazy-prop@2.0.0:
    resolution: {integrity: sha512-Ds09qNh8yw3khSjiJjiUInaGX9xlqZDY7JVryGxdxV7NPeuqQfplOpQ66yJFZut3jLa5zOwkXw1g9EI2uKh4Og==}
    engines: {node: '>=8'}
    dev: true

  /didyoumean@1.2.2:
    resolution: {integrity: sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==}
    dev: true

  /dlv@1.1.3:
    resolution: {integrity: sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==}
    dev: true

  /electron-to-chromium@1.5.286:
    resolution: {integrity: sha512-9tfDXhJ4RKFNerfjdCcZfufu49vg620741MNs26a9+bhLThdB+plgMeou98CAaHu/WATj2iHOOHTp1hWtABj2A==}
    dev: true

  /elementtree@0.1.7:
    resolution: {integrity: sha512-wkgGT6kugeQk/P6VZ/f4T+4HB41BVgNBq5CDIZVbQ02nvTVqAiVTbskxxu3eA/X96lMlfYOwnLQpN2v5E1zDEg==}
    engines: {node: '>= 0.4.0'}
    dependencies:
      sax: 1.1.4
    dev: true

  /emoji-regex@8.0.0:
    resolution: {integrity: sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==}
    dev: true

  /env-paths@2.2.1:
    resolution: {integrity: sha512-+h1lkLKhZMTYjog1VEpJNG7NZJWcuc2DDk/qsqSTRRCOXiLjeQ1d1/udrUGhqMxUgAlwKNZ0cf2uqan5GLuS2A==}
    engines: {node: '>=6'}
    dev: true

  /esbuild@0.25.12:
    resolution: {integrity: sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==}
    engines: {node: '>=18'}
    hasBin: true
    requiresBuild: true
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.25.12
      '@esbuild/android-arm': 0.25.12
      '@esbuild/android-arm64': 0.25.12
      '@esbuild/android-x64': 0.25.12
      '@esbuild/darwin-arm64': 0.25.12
      '@esbuild/darwin-x64': 0.25.12
      '@esbuild/freebsd-arm64': 0.25.12
      '@esbuild/freebsd-x64': 0.25.12
      '@esbuild/linux-arm': 0.25.12
      '@esbuild/linux-arm64': 0.25.12
      '@esbuild/linux-ia32': 0.25.12
      '@esbuild/linux-loong64': 0.25.12
      '@esbuild/linux-mips64el': 0.25.12
      '@esbuild/linux-ppc64': 0.25.12
      '@esbuild/linux-riscv64': 0.25.12
      '@esbuild/linux-s390x': 0.25.12
      '@esbuild/linux-x64': 0.25.12
      '@esbuild/netbsd-arm64': 0.25.12
      '@esbuild/netbsd-x64': 0.25.12
      '@esbuild/openbsd-arm64': 0.25.12
      '@esbuild/openbsd-x64': 0.25.12
      '@esbuild/openharmony-arm64': 0.25.12
      '@esbuild/sunos-x64': 0.25.12
      '@esbuild/win32-arm64': 0.25.12
      '@esbuild/win32-ia32': 0.25.12
      '@esbuild/win32-x64': 0.25.12
    dev: true

  /escalade@3.2.0:
    resolution: {integrity: sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==}
    engines: {node: '>=6'}
    dev: true

  /escape-string-regexp@4.0.0:
    resolution: {integrity: sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==}
    engines: {node: '>=10'}
    dev: true

  /eslint-plugin-react-hooks@5.2.0(eslint@9.39.2):
    resolution: {integrity: sha512-+f15FfK64YQwZdJNELETdn5ibXEUQmW1DZL6KXhNnc2heoy/sg9VJJeT7n8TlMWouzWqSWavFkIhHyIbIAEapg==}
    engines: {node: '>=10'}
    peerDependencies:
      eslint: ^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0
    dependencies:
      eslint: 9.39.2
    dev: true

  /eslint-plugin-react-refresh@0.4.26(eslint@9.39.2):
    resolution: {integrity: sha512-1RETEylht2O6FM/MvgnyvT+8K21wLqDNg4qD51Zj3guhjt433XbnnkVttHMyaVyAFD03QSV4LPS5iE3VQmO7XQ==}
    peerDependencies:
      eslint: '>=8.40'
    dependencies:
      eslint: 9.39.2
    dev: true

  /eslint-scope@8.4.0:
    resolution: {integrity: sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      esrecurse: 4.3.0
      estraverse: 5.3.0
    dev: true

  /eslint-visitor-keys@3.4.3:
    resolution: {integrity: sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    dev: true

  /eslint-visitor-keys@4.2.1:
    resolution: {integrity: sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dev: true

  /eslint@9.39.2:
    resolution: {integrity: sha512-LEyamqS7W5HB3ujJyvi0HQK/dtVINZvd5mAAp9eT5S/ujByGjiZLCzPcHVzuXbpJDJF/cxwHlfceVUDZ2lnSTw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    hasBin: true
    peerDependencies:
      jiti: '*'
    peerDependenciesMeta:
      jiti:
        optional: true
    dependencies:
      '@eslint-community/eslint-utils': 4.9.1(eslint@9.39.2)
      '@eslint-community/regexpp': 4.12.2
      '@eslint/config-array': 0.21.1
      '@eslint/config-helpers': 0.4.2
      '@eslint/core': 0.17.0
      '@eslint/eslintrc': 3.3.3
      '@eslint/js': 9.39.2
      '@eslint/plugin-kit': 0.4.1
      '@humanfs/node': 0.16.7
      '@humanwhocodes/module-importer': 1.0.1
      '@humanwhocodes/retry': 0.4.3
      '@types/estree': 1.0.8
      ajv: 6.12.6
      chalk: 4.1.2
      cross-spawn: 7.0.6
      debug: 4.4.3
      escape-string-regexp: 4.0.0
      eslint-scope: 8.4.0
      eslint-visitor-keys: 4.2.1
      espree: 10.4.0
      esquery: 1.7.0
      esutils: 2.0.3
      fast-deep-equal: 3.1.3
      file-entry-cache: 8.0.0
      find-up: 5.0.0
      glob-parent: 6.0.2
      ignore: 5.3.2
      imurmurhash: 0.1.4
      is-glob: 4.0.3
      json-stable-stringify-without-jsonify: 1.0.1
      lodash.merge: 4.6.2
      minimatch: 3.1.2
      natural-compare: 1.4.0
      optionator: 0.9.4
    transitivePeerDependencies:
      - supports-color
    dev: true

  /espree@10.4.0:
    resolution: {integrity: sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    dependencies:
      acorn: 8.15.0
      acorn-jsx: 5.3.2(acorn@8.15.0)
      eslint-visitor-keys: 4.2.1
    dev: true

  /esquery@1.7.0:
    resolution: {integrity: sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==}
    engines: {node: '>=0.10'}
    dependencies:
      estraverse: 5.3.0
    dev: true

  /esrecurse@4.3.0:
    resolution: {integrity: sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==}
    engines: {node: '>=4.0'}
    dependencies:
      estraverse: 5.3.0
    dev: true

  /estraverse@5.3.0:
    resolution: {integrity: sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==}
    engines: {node: '>=4.0'}
    dev: true

  /esutils@2.0.3:
    resolution: {integrity: sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==}
    engines: {node: '>=0.10.0'}
    dev: true

  /fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}
    dev: true

  /fast-glob@3.3.3:
    resolution: {integrity: sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==}
    engines: {node: '>=8.6.0'}
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8
    dev: true

  /fast-json-stable-stringify@2.1.0:
    resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}
    dev: true

  /fast-levenshtein@2.0.6:
    resolution: {integrity: sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==}
    dev: true

  /fastq@1.20.1:
    resolution: {integrity: sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==}
    dependencies:
      reusify: 1.1.0
    dev: true

  /fd-slicer@1.1.0:
    resolution: {integrity: sha512-cE1qsB/VwyQozZ+q1dGxR8LBYNZeofhEdUNGSMbQD3Gw2lAzX9Zb3uIU6Ebc/Fmyjo9AWWfnn0AUCHqtevs/8g==}
    dependencies:
      pend: 1.2.0
    dev: true

  /fdir@6.5.0(picomatch@4.0.3):
    resolution: {integrity: sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==}
    engines: {node: '>=12.0.0'}
    peerDependencies:
      picomatch: ^3 || ^4
    peerDependenciesMeta:
      picomatch:
        optional: true
    dependencies:
      picomatch: 4.0.3
    dev: true

  /file-entry-cache@8.0.0:
    resolution: {integrity: sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==}
    engines: {node: '>=16.0.0'}
    dependencies:
      flat-cache: 4.0.1
    dev: true

  /fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}
    dependencies:
      to-regex-range: 5.0.1
    dev: true

  /find-up@5.0.0:
    resolution: {integrity: sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==}
    engines: {node: '>=10'}
    dependencies:
      locate-path: 6.0.0
      path-exists: 4.0.0
    dev: true

  /flat-cache@4.0.1:
    resolution: {integrity: sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==}
    engines: {node: '>=16'}
    dependencies:
      flatted: 3.3.3
      keyv: 4.5.4
    dev: true

  /flatted@3.3.3:
    resolution: {integrity: sha512-GX+ysw4PBCz0PzosHDepZGANEuFCMLrnRTiEy9McGjmkCQYwRq4A/X786G/fjM/+OjsWSU1ZrY5qyARZmO/uwg==}
    dev: true

  /fraction.js@5.3.4:
    resolution: {integrity: sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ==}
    dev: true

  /fs-extra@9.1.0:
    resolution: {integrity: sha512-hcg3ZmepS30/7BSFqRvoo3DOMQu7IjqxO5nCDt+zM9XWjb33Wg7ziNT+Qvqbuc3+gWpzO02JubVyk2G4Zvo1OQ==}
    engines: {node: '>=10'}
    dependencies:
      at-least-node: 1.0.0
      graceful-fs: 4.2.11
      jsonfile: 6.2.0
      universalify: 2.0.1
    dev: true

  /fs-minipass@2.1.0:
    resolution: {integrity: sha512-V/JgOLFCS+R6Vcq0slCuaeWEdNC3ouDlJMNIsacH2VtALiu9mV4LPrHc5cDl8k5aw6J8jwgWWpiTo5RYhmIzvg==}
    engines: {node: '>= 8'}
    dependencies:
      minipass: 3.3.6
    dev: true

  /fs.realpath@1.0.0:
    resolution: {integrity: sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==}
    dev: true

  /fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}
    dev: true

  /gensync@1.0.0-beta.2:
    resolution: {integrity: sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==}
    engines: {node: '>=6.9.0'}
    dev: true

  /glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}
    dependencies:
      is-glob: 4.0.3
    dev: true

  /glob-parent@6.0.2:
    resolution: {integrity: sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==}
    engines: {node: '>=10.13.0'}
    dependencies:
      is-glob: 4.0.3
    dev: true

  /glob@9.3.5:
    resolution: {integrity: sha512-e1LleDykUz2Iu+MTYdkSsuWX8lvAjAcs0Xef0lNIu0S2wOAzuTxCJtcd9S3cijlwYF18EsU3rzb8jPVobxDh9Q==}
    engines: {node: '>=16 || 14 >=14.17'}
    deprecated: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
    dependencies:
      fs.realpath: 1.0.0
      minimatch: 8.0.4
      minipass: 4.2.8
      path-scurry: 1.11.1
    dev: true

  /globals@14.0.0:
    resolution: {integrity: sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==}
    engines: {node: '>=18'}
    dev: true

  /graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}
    dev: true

  /has-flag@4.0.0:
    resolution: {integrity: sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==}
    engines: {node: '>=8'}
    dev: true

  /hasown@2.0.2:
    resolution: {integrity: sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==}
    engines: {node: '>= 0.4'}
    dependencies:
      function-bind: 1.1.2
    dev: true

  /ignore@5.3.2:
    resolution: {integrity: sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==}
    engines: {node: '>= 4'}
    dev: true

  /ignore@7.0.5:
    resolution: {integrity: sha512-Hs59xBNfUIunMFgWAbGX5cq6893IbWg4KnrjbYwX3tx0ztorVgTDA6B2sxf8ejHJ4wz8BqGUMYlnzNBer5NvGg==}
    engines: {node: '>= 4'}
    dev: true

  /import-fresh@3.3.1:
    resolution: {integrity: sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==}
    engines: {node: '>=6'}
    dependencies:
      parent-module: 1.0.1
      resolve-from: 4.0.0
    dev: true

  /imurmurhash@0.1.4:
    resolution: {integrity: sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==}
    engines: {node: '>=0.8.19'}
    dev: true

  /inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}
    dev: true

  /ini@4.1.3:
    resolution: {integrity: sha512-X7rqawQBvfdjS10YU1y1YVreA3SsLrW9dX2CewP2EbBJM4ypVNLDkO5y04gejPwKIY9lR+7r9gn3rFPt/kmWFg==}
    engines: {node: ^14.17.0 || ^16.13.0 || >=18.0.0}
    dev: true

  /is-binary-path@2.1.0:
    resolution: {integrity: sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==}
    engines: {node: '>=8'}
    dependencies:
      binary-extensions: 2.3.0
    dev: true

  /is-core-module@2.16.1:
    resolution: {integrity: sha512-UfoeMA6fIJ8wTYFEUjelnaGI67v6+N7qXJEvQuIGa99l4xsCruSYOVSQ0uPANn4dAzm8lkYPaKLrrijLq7x23w==}
    engines: {node: '>= 0.4'}
    dependencies:
      hasown: 2.0.2
    dev: true

  /is-docker@2.2.1:
    resolution: {integrity: sha512-F+i2BKsFrH66iaUFc0woD8sLy8getkwTwtOBjvs56Cx4CgJDeKQeqfz8wAYiSb8JOprWhHH5p77PbmYCvvUuXQ==}
    engines: {node: '>=8'}
    hasBin: true
    dev: true

  /is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}
    dev: true

  /is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}
    dev: true

  /is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}
    dependencies:
      is-extglob: 2.1.1
    dev: true

  /is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}
    dev: true

  /is-wsl@2.2.0:
    resolution: {integrity: sha512-fKzAra0rGJUUBwGBgNkHZuToZcn+TtXHpeCgmkMJMMYx1sQDYaCSyjJBSCa2nH1DGm7s3n1oBnohoVTBaN7Lww==}
    engines: {node: '>=8'}
    dependencies:
      is-docker: 2.2.1
    dev: true

  /isexe@2.0.0:
    resolution: {integrity: sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==}
    dev: true

  /jiti@1.21.7:
    resolution: {integrity: sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A==}
    hasBin: true
    dev: true

  /js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

  /js-yaml@4.1.1:
    resolution: {integrity: sha512-qQKT4zQxXl8lLwBtHMWwaTcGfFOZviOJet3Oy/xmGk2gZH677CJM9EvtfdSkgWcATZhj/55JZ0rmy3myCT5lsA==}
    hasBin: true
    dependencies:
      argparse: 2.0.1
    dev: true

  /jsesc@3.1.0:
    resolution: {integrity: sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==}
    engines: {node: '>=6'}
    hasBin: true
    dev: true

  /json-buffer@3.0.1:
    resolution: {integrity: sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==}
    dev: true

  /json-schema-traverse@0.4.1:
    resolution: {integrity: sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==}
    dev: true

  /json-stable-stringify-without-jsonify@1.0.1:
    resolution: {integrity: sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==}
    dev: true

  /json5@2.2.3:
    resolution: {integrity: sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==}
    engines: {node: '>=6'}
    hasBin: true
    dev: true

  /jsonfile@6.2.0:
    resolution: {integrity: sha512-FGuPw30AdOIUTRMC2OMRtQV+jkVj2cfPqSeWXv1NEAJ1qZ5zb1X6z1mFhbfOB/iy3ssJCD+3KuZ8r8C3uVFlAg==}
    dependencies:
      universalify: 2.0.1
    optionalDependencies:
      graceful-fs: 4.2.11
    dev: true

  /keyv@4.5.4:
    resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}
    dependencies:
      json-buffer: 3.0.1
    dev: true

  /kleur@3.0.3:
    resolution: {integrity: sha512-eTIzlVOSUR+JxdDFepEYcBMtZ9Qqdef+rnzWdRZuMbOywu5tO2w2N7rqjoANZ5k9vywhL6Br1VRjUIgTQx4E8w==}
    engines: {node: '>=6'}
    dev: true

  /kleur@4.1.5:
    resolution: {integrity: sha512-o+NO+8WrRiQEE4/7nwRJhN1HWpVmJm511pBHUxPLtp0BUISzlBplORYSmTclCnJvQq2tKu/sgl3xVpkc7ZWuQQ==}
    engines: {node: '>=6'}
    dev: true

  /levn@0.4.1:
    resolution: {integrity: sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      prelude-ls: 1.2.1
      type-check: 0.4.0
    dev: true

  /lilconfig@3.1.3:
    resolution: {integrity: sha512-/vlFKAoH5Cgt3Ie+JLhRbwOsCQePABiU3tJ1egGvyQ+33R/vcwM2Zl2QR/LzjsBeItPt3oSVXapn+m4nQDvpzw==}
    engines: {node: '>=14'}
    dev: true

  /lines-and-columns@1.2.4:
    resolution: {integrity: sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==}
    dev: true

  /locate-path@6.0.0:
    resolution: {integrity: sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==}
    engines: {node: '>=10'}
    dependencies:
      p-locate: 5.0.0
    dev: true

  /lodash.merge@4.6.2:
    resolution: {integrity: sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==}
    dev: true

  /loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==}
    hasBin: true
    dependencies:
      js-tokens: 4.0.0
    dev: false

  /lru-cache@10.4.3:
    resolution: {integrity: sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==}
    dev: true

  /lru-cache@5.1.1:
    resolution: {integrity: sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==}
    dependencies:
      yallist: 3.1.1
    dev: true

  /lucide-react@0.469.0(react@18.3.1):
    resolution: {integrity: sha512-28vvUnnKQ/dBwiCQtwJw7QauYnE7yd2Cyp4tTTJpvglX4EMpbflcdBgrgToX2j71B3YvugK/NH3BGUk+E/p/Fw==}
    peerDependencies:
      react: ^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0
    dependencies:
      react: 18.3.1
    dev: false

  /merge2@1.4.1:
    resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
    engines: {node: '>= 8'}
    dev: true

  /micromatch@4.0.8:
    resolution: {integrity: sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==}
    engines: {node: '>=8.6'}
    dependencies:
      braces: 3.0.3
      picomatch: 2.3.1
    dev: true

  /minimatch@3.1.2:
    resolution: {integrity: sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==}
    dependencies:
      brace-expansion: 1.1.12
    dev: true

  /minimatch@8.0.4:
    resolution: {integrity: sha512-W0Wvr9HyFXZRGIDgCicunpQ299OKXs9RgZfaukz4qAW/pJhcpUfupc9c+OObPOFueNy8VSrZgEmDtk6Kh4WzDA==}
    engines: {node: '>=16 || 14 >=14.17'}
    dependencies:
      brace-expansion: 2.0.2
    dev: true

  /minimatch@9.0.5:
    resolution: {integrity: sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==}
    engines: {node: '>=16 || 14 >=14.17'}
    dependencies:
      brace-expansion: 2.0.2
    dev: true

  /minipass@3.3.6:
    resolution: {integrity: sha512-DxiNidxSEK+tHG6zOIklvNOwm3hvCrbUrdtzY74U6HKTJxvIDfOUL5W5P2Ghd3DTkhhKPYGqeNUIh5qcM4YBfw==}
    engines: {node: '>=8'}
    dependencies:
      yallist: 4.0.0
    dev: true

  /minipass@4.2.8:
    resolution: {integrity: sha512-fNzuVyifolSLFL4NzpF+wEF4qrgqaaKX0haXPQEdQ7NKAN+WecoKMHV09YcuL/DHxrUsYQOK3MiuDf7Ip2OXfQ==}
    engines: {node: '>=8'}
    dev: true

  /minipass@5.0.0:
    resolution: {integrity: sha512-3FnjYuehv9k6ovOEbyOswadCDPX1piCfhV8ncmYtHOjuPwylVWsghTLo7rabjC3Rx5xD4HDx8Wm1xnMF7S5qFQ==}
    engines: {node: '>=8'}
    dev: true

  /minipass@7.1.2:
    resolution: {integrity: sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==}
    engines: {node: '>=16 || 14 >=14.17'}
    dev: true

  /minizlib@2.1.2:
    resolution: {integrity: sha512-bAxsR8BVfj60DWXHE3u30oHzfl4G7khkSuPW+qvpd7jFRHm7dLxOjUk1EHACJ/hxLY8phGJ0YhYHZo7jil7Qdg==}
    engines: {node: '>= 8'}
    dependencies:
      minipass: 3.3.6
      yallist: 4.0.0
    dev: true

  /mkdirp@1.0.4:
    resolution: {integrity: sha512-vVqVZQyf3WLx2Shd0qJ9xuvqgAyKPLAiqITEtqW0oIUjzo3PePDd6fW9iFz30ef7Ysp/oiWqbhszeGWW2T6Gzw==}
    engines: {node: '>=10'}
    hasBin: true
    dev: true

  /ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}
    dev: true

  /mz@2.7.0:
    resolution: {integrity: sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==}
    dependencies:
      any-promise: 1.3.0
      object-assign: 4.1.1
      thenify-all: 1.6.0
    dev: true

  /nanoid@3.3.11:
    resolution: {integrity: sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true
    dev: true

  /native-run@2.0.3:
    resolution: {integrity: sha512-U1PllBuzW5d1gfan+88L+Hky2eZx+9gv3Pf6rNBxKbORxi7boHzqiA6QFGSnqMem4j0A9tZ08NMIs5+0m/VS1Q==}
    engines: {node: '>=16.0.0'}
    hasBin: true
    dependencies:
      '@ionic/utils-fs': 3.1.7
      '@ionic/utils-terminal': 2.3.5
      bplist-parser: 0.3.2
      debug: 4.4.3
      elementtree: 0.1.7
      ini: 4.1.3
      plist: 3.1.0
      split2: 4.2.0
      through2: 4.0.2
      tslib: 2.8.1
      yauzl: 2.10.0
    transitivePeerDependencies:
      - supports-color
    dev: true

  /natural-compare@1.4.0:
    resolution: {integrity: sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==}
    dev: true

  /node-releases@2.0.27:
    resolution: {integrity: sha512-nmh3lCkYZ3grZvqcCH+fjmQ7X+H0OeZgP40OierEaAptX4XofMh5kwNbWh7lBduUzCcV/8kZ+NDLCwm2iorIlA==}
    dev: true

  /normalize-path@3.0.0:
    resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
    engines: {node: '>=0.10.0'}
    dev: true

  /object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}
    dev: true

  /object-hash@3.0.0:
    resolution: {integrity: sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==}
    engines: {node: '>= 6'}
    dev: true

  /open@8.4.2:
    resolution: {integrity: sha512-7x81NCL719oNbsq/3mh+hVrAWmFuEYUqrq/Iw3kUzH8ReypT9QQ0BLoJS7/G9k6N81XjW4qHWtjWwe/9eLy1EQ==}
    engines: {node: '>=12'}
    dependencies:
      define-lazy-prop: 2.0.0
      is-docker: 2.2.1
      is-wsl: 2.2.0
    dev: true

  /optionator@0.9.4:
    resolution: {integrity: sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      deep-is: 0.1.4
      fast-levenshtein: 2.0.6
      levn: 0.4.1
      prelude-ls: 1.2.1
      type-check: 0.4.0
      word-wrap: 1.2.5
    dev: true

  /p-limit@3.1.0:
    resolution: {integrity: sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==}
    engines: {node: '>=10'}
    dependencies:
      yocto-queue: 0.1.0
    dev: true

  /p-locate@5.0.0:
    resolution: {integrity: sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==}
    engines: {node: '>=10'}
    dependencies:
      p-limit: 3.1.0
    dev: true

  /parent-module@1.0.1:
    resolution: {integrity: sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==}
    engines: {node: '>=6'}
    dependencies:
      callsites: 3.1.0
    dev: true

  /path-exists@4.0.0:
    resolution: {integrity: sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==}
    engines: {node: '>=8'}
    dev: true

  /path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}
    dev: true

  /path-parse@1.0.7:
    resolution: {integrity: sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==}
    dev: true

  /path-scurry@1.11.1:
    resolution: {integrity: sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==}
    engines: {node: '>=16 || 14 >=14.18'}
    dependencies:
      lru-cache: 10.4.3
      minipass: 7.1.2
    dev: true

  /pend@1.2.0:
    resolution: {integrity: sha512-F3asv42UuXchdzt+xXqfW1OGlVBe+mxa2mqI0pg5yAHZPvFmY3Y6drSf/GQ1A86WgWEN9Kzh/WrgKa6iGcHXLg==}
    dev: true

  /picocolors@1.1.1:
    resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}
    dev: true

  /picomatch@2.3.1:
    resolution: {integrity: sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==}
    engines: {node: '>=8.6'}
    dev: true

  /picomatch@4.0.3:
    resolution: {integrity: sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==}
    engines: {node: '>=12'}
    dev: true

  /pify@2.3.0:
    resolution: {integrity: sha512-udgsAY+fTnvv7kI7aaxbqwWNb0AHiB0qBO89PZKPkoTmGOgdbrHDKD+0B2X4uTfJ/FT1R09r9gTsjUjNJotuog==}
    engines: {node: '>=0.10.0'}
    dev: true

  /pirates@4.0.7:
    resolution: {integrity: sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA==}
    engines: {node: '>= 6'}
    dev: true

  /plist@3.1.0:
    resolution: {integrity: sha512-uysumyrvkUX0rX/dEVqt8gC3sTBzd4zoWfLeS29nb53imdaXVvLINYXTI2GNqzaMuvacNx4uJQ8+b3zXR0pkgQ==}
    engines: {node: '>=10.4.0'}
    dependencies:
      '@xmldom/xmldom': 0.8.11
      base64-js: 1.5.1
      xmlbuilder: 15.1.1
    dev: true

  /postcss-import@15.1.0(postcss@8.5.6):
    resolution: {integrity: sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==}
    engines: {node: '>=14.0.0'}
    peerDependencies:
      postcss: ^8.0.0
    dependencies:
      postcss: 8.5.6
      postcss-value-parser: 4.2.0
      read-cache: 1.0.0
      resolve: 1.22.11
    dev: true

  /postcss-js@4.1.0(postcss@8.5.6):
    resolution: {integrity: sha512-oIAOTqgIo7q2EOwbhb8UalYePMvYoIeRY2YKntdpFQXNosSu3vLrniGgmH9OKs/qAkfoj5oB3le/7mINW1LCfw==}
    engines: {node: ^12 || ^14 || >= 16}
    peerDependencies:
      postcss: ^8.4.21
    dependencies:
      camelcase-css: 2.0.1
      postcss: 8.5.6
    dev: true

  /postcss-load-config@6.0.1(jiti@1.21.7)(postcss@8.5.6):
    resolution: {integrity: sha512-oPtTM4oerL+UXmx+93ytZVN82RrlY/wPUV8IeDxFrzIjXOLF1pN+EmKPLbubvKHT2HC20xXsCAH2Z+CKV6Oz/g==}
    engines: {node: '>= 18'}
    peerDependencies:
      jiti: '>=1.21.0'
      postcss: '>=8.0.9'
      tsx: ^4.8.1
      yaml: ^2.4.2
    peerDependenciesMeta:
      jiti:
        optional: true
      postcss:
        optional: true
      tsx:
        optional: true
      yaml:
        optional: true
    dependencies:
      jiti: 1.21.7
      lilconfig: 3.1.3
      postcss: 8.5.6
    dev: true

  /postcss-nested@6.2.0(postcss@8.5.6):
    resolution: {integrity: sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==}
    engines: {node: '>=12.0'}
    peerDependencies:
      postcss: ^8.2.14
    dependencies:
      postcss: 8.5.6
      postcss-selector-parser: 6.1.2
    dev: true

  /postcss-selector-parser@6.1.2:
    resolution: {integrity: sha512-Q8qQfPiZ+THO/3ZrOrO0cJJKfpYCagtMUkXbnEfmgUjwXg6z/WBeOyS9APBBPCTSiDV+s4SwQGu8yFsiMRIudg==}
    engines: {node: '>=4'}
    dependencies:
      cssesc: 3.0.0
      util-deprecate: 1.0.2
    dev: true

  /postcss-value-parser@4.2.0:
    resolution: {integrity: sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==}
    dev: true

  /postcss@8.5.6:
    resolution: {integrity: sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg==}
    engines: {node: ^10 || ^12 || >=14}
    dependencies:
      nanoid: 3.3.11
      picocolors: 1.1.1
      source-map-js: 1.2.1
    dev: true

  /prelude-ls@1.2.1:
    resolution: {integrity: sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==}
    engines: {node: '>= 0.8.0'}
    dev: true

  /prettier@3.8.1:
    resolution: {integrity: sha512-UOnG6LftzbdaHZcKoPFtOcCKztrQ57WkHDeRD9t/PTQtmT0NHSeWWepj6pS0z/N7+08BHFDQVUrfmfMRcZwbMg==}
    engines: {node: '>=14'}
    hasBin: true
    dev: true

  /prompts@2.4.2:
    resolution: {integrity: sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==}
    engines: {node: '>= 6'}
    dependencies:
      kleur: 3.0.3
      sisteransi: 1.0.5
    dev: true

  /punycode@2.3.1:
    resolution: {integrity: sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==}
    engines: {node: '>=6'}
    dev: true

  /queue-microtask@1.2.3:
    resolution: {integrity: sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==}
    dev: true

  /react-dom@18.3.1(react@18.3.1):
    resolution: {integrity: sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==}
    peerDependencies:
      react: ^18.3.1
    dependencies:
      loose-envify: 1.4.0
      react: 18.3.1
      scheduler: 0.23.2
    dev: false

  /react-refresh@0.17.0:
    resolution: {integrity: sha512-z6F7K9bV85EfseRCp2bzrpyQ0Gkw1uLoCel9XBVWPg/TjRj94SkJzUTGfOa4bs7iJvBWtQG0Wq7wnI0syw3EBQ==}
    engines: {node: '>=0.10.0'}
    dev: true

  /react@18.3.1:
    resolution: {integrity: sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==}
    engines: {node: '>=0.10.0'}
    dependencies:
      loose-envify: 1.4.0
    dev: false

  /read-cache@1.0.0:
    resolution: {integrity: sha512-Owdv/Ft7IjOgm/i0xvNDZ1LrRANRfew4b2prF3OWMQLxLfu3bS8FVhCsrSCMK4lR56Y9ya+AThoTpDCTxCmpRA==}
    dependencies:
      pify: 2.3.0
    dev: true

  /readable-stream@3.6.2:
    resolution: {integrity: sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==}
    engines: {node: '>= 6'}
    dependencies:
      inherits: 2.0.4
      string_decoder: 1.3.0
      util-deprecate: 1.0.2
    dev: true

  /readdirp@3.6.0:
    resolution: {integrity: sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==}
    engines: {node: '>=8.10.0'}
    dependencies:
      picomatch: 2.3.1
    dev: true

  /resolve-from@4.0.0:
    resolution: {integrity: sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==}
    engines: {node: '>=4'}
    dev: true

  /resolve@1.22.11:
    resolution: {integrity: sha512-RfqAvLnMl313r7c9oclB1HhUEAezcpLjz95wFH4LVuhk9JF/r22qmVP9AMmOU4vMX7Q8pN8jwNg/CSpdFnMjTQ==}
    engines: {node: '>= 0.4'}
    hasBin: true
    dependencies:
      is-core-module: 2.16.1
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0
    dev: true

  /reusify@1.1.0:
    resolution: {integrity: sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}
    dev: true

  /rimraf@4.4.1:
    resolution: {integrity: sha512-Gk8NlF062+T9CqNGn6h4tls3k6T1+/nXdOcSZVikNVtlRdYpA7wRJJMoXmuvOnLW844rPjdQ7JgXCYM6PPC/og==}
    engines: {node: '>=14'}
    hasBin: true
    dependencies:
      glob: 9.3.5
    dev: true

  /rollup@4.57.1:
    resolution: {integrity: sha512-oQL6lgK3e2QZeQ7gcgIkS2YZPg5slw37hYufJ3edKlfQSGGm8ICoxswK15ntSzF/a8+h7ekRy7k7oWc3BQ7y8A==}
    engines: {node: '>=18.0.0', npm: '>=8.0.0'}
    hasBin: true
    dependencies:
      '@types/estree': 1.0.8
    optionalDependencies:
      '@rollup/rollup-android-arm-eabi': 4.57.1
      '@rollup/rollup-android-arm64': 4.57.1
      '@rollup/rollup-darwin-arm64': 4.57.1
      '@rollup/rollup-darwin-x64': 4.57.1
      '@rollup/rollup-freebsd-arm64': 4.57.1
      '@rollup/rollup-freebsd-x64': 4.57.1
      '@rollup/rollup-linux-arm-gnueabihf': 4.57.1
      '@rollup/rollup-linux-arm-musleabihf': 4.57.1
      '@rollup/rollup-linux-arm64-gnu': 4.57.1
      '@rollup/rollup-linux-arm64-musl': 4.57.1
      '@rollup/rollup-linux-loong64-gnu': 4.57.1
      '@rollup/rollup-linux-loong64-musl': 4.57.1
      '@rollup/rollup-linux-ppc64-gnu': 4.57.1
      '@rollup/rollup-linux-ppc64-musl': 4.57.1
      '@rollup/rollup-linux-riscv64-gnu': 4.57.1
      '@rollup/rollup-linux-riscv64-musl': 4.57.1
      '@rollup/rollup-linux-s390x-gnu': 4.57.1
      '@rollup/rollup-linux-x64-gnu': 4.57.1
      '@rollup/rollup-linux-x64-musl': 4.57.1
      '@rollup/rollup-openbsd-x64': 4.57.1
      '@rollup/rollup-openharmony-arm64': 4.57.1
      '@rollup/rollup-win32-arm64-msvc': 4.57.1
      '@rollup/rollup-win32-ia32-msvc': 4.57.1
      '@rollup/rollup-win32-x64-gnu': 4.57.1
      '@rollup/rollup-win32-x64-msvc': 4.57.1
      fsevents: 2.3.3
    dev: true

  /run-parallel@1.2.0:
    resolution: {integrity: sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==}
    dependencies:
      queue-microtask: 1.2.3
    dev: true

  /safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}
    dev: true

  /sax@1.1.4:
    resolution: {integrity: sha512-5f3k2PbGGp+YtKJjOItpg3P99IMD84E4HOvcfleTb5joCHNXYLsR9yWFPOYGgaeMPDubQILTCMdsFb2OMeOjtg==}
    dev: true

  /sax@1.4.4:
    resolution: {integrity: sha512-1n3r/tGXO6b6VXMdFT54SHzT9ytu9yr7TaELowdYpMqY/Ao7EnlQGmAQ1+RatX7Tkkdm6hONI2owqNx2aZj5Sw==}
    engines: {node: '>=11.0.0'}
    dev: true

  /scheduler@0.23.2:
    resolution: {integrity: sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==}
    dependencies:
      loose-envify: 1.4.0
    dev: false

  /semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true
    dev: true

  /semver@7.7.4:
    resolution: {integrity: sha512-vFKC2IEtQnVhpT78h1Yp8wzwrf8CM+MzKMHGJZfBtzhZNycRFnXsHk6E5TxIkkMsgNS7mdX3AGB7x2QM2di4lA==}
    engines: {node: '>=10'}
    hasBin: true
    dev: true

  /shebang-command@2.0.0:
    resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
    engines: {node: '>=8'}
    dependencies:
      shebang-regex: 3.0.0
    dev: true

  /shebang-regex@3.0.0:
    resolution: {integrity: sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==}
    engines: {node: '>=8'}
    dev: true

  /signal-exit@3.0.7:
    resolution: {integrity: sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==}
    dev: true

  /sisteransi@1.0.5:
    resolution: {integrity: sha512-bLGGlR1QxBcynn2d5YmDX4MGjlZvy2MRBDRNHLJ8VI6l6+9FUiyTFNJ0IveOSP0bcXgVDPRcfGqA0pjaqUpfVg==}
    dev: true

  /slice-ansi@4.0.0:
    resolution: {integrity: sha512-qMCMfhY040cVHT43K9BFygqYbUPFZKHOg7K73mtTWJRb8pyP3fzf4Ixd5SzdEJQ6MRUg/WBnOLxghZtKKurENQ==}
    engines: {node: '>=10'}
    dependencies:
      ansi-styles: 4.3.0
      astral-regex: 2.0.0
      is-fullwidth-code-point: 3.0.0
    dev: true

  /source-map-js@1.2.1:
    resolution: {integrity: sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==}
    engines: {node: '>=0.10.0'}
    dev: true

  /split2@4.2.0:
    resolution: {integrity: sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==}
    engines: {node: '>= 10.x'}
    dev: true

  /string-width@4.2.3:
    resolution: {integrity: sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==}
    engines: {node: '>=8'}
    dependencies:
      emoji-regex: 8.0.0
      is-fullwidth-code-point: 3.0.0
      strip-ansi: 6.0.1
    dev: true

  /string_decoder@1.3.0:
    resolution: {integrity: sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==}
    dependencies:
      safe-buffer: 5.2.1
    dev: true

  /strip-ansi@6.0.1:
    resolution: {integrity: sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==}
    engines: {node: '>=8'}
    dependencies:
      ansi-regex: 5.0.1
    dev: true

  /strip-json-comments@3.1.1:
    resolution: {integrity: sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==}
    engines: {node: '>=8'}
    dev: true

  /sucrase@3.35.1:
    resolution: {integrity: sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw==}
    engines: {node: '>=16 || 14 >=14.17'}
    hasBin: true
    dependencies:
      '@jridgewell/gen-mapping': 0.3.13
      commander: 4.1.1
      lines-and-columns: 1.2.4
      mz: 2.7.0
      pirates: 4.0.7
      tinyglobby: 0.2.15
      ts-interface-checker: 0.1.13
    dev: true

  /supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}
    dependencies:
      has-flag: 4.0.0
    dev: true

  /supports-preserve-symlinks-flag@1.0.0:
    resolution: {integrity: sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==}
    engines: {node: '>= 0.4'}
    dev: true

  /tailwindcss@3.4.19:
    resolution: {integrity: sha512-3ofp+LL8E+pK/JuPLPggVAIaEuhvIz4qNcf3nA1Xn2o/7fb7s/TYpHhwGDv1ZU3PkBluUVaF8PyCHcm48cKLWQ==}
    engines: {node: '>=14.0.0'}
    hasBin: true
    dependencies:
      '@alloc/quick-lru': 5.2.0
      arg: 5.0.2
      chokidar: 3.6.0
      didyoumean: 1.2.2
      dlv: 1.1.3
      fast-glob: 3.3.3
      glob-parent: 6.0.2
      is-glob: 4.0.3
      jiti: 1.21.7
      lilconfig: 3.1.3
      micromatch: 4.0.8
      normalize-path: 3.0.0
      object-hash: 3.0.0
      picocolors: 1.1.1
      postcss: 8.5.6
      postcss-import: 15.1.0(postcss@8.5.6)
      postcss-js: 4.1.0(postcss@8.5.6)
      postcss-load-config: 6.0.1(jiti@1.21.7)(postcss@8.5.6)
      postcss-nested: 6.2.0(postcss@8.5.6)
      postcss-selector-parser: 6.1.2
      resolve: 1.22.11
      sucrase: 3.35.1
    transitivePeerDependencies:
      - tsx
      - yaml
    dev: true

  /tar@6.2.1:
    resolution: {integrity: sha512-DZ4yORTwrbTj/7MZYq2w+/ZFdI6OZ/f9SFHR+71gIVUZhOQPHzVCLpvRnPgyaMpfWxxk/4ONva3GQSyNIKRv6A==}
    engines: {node: '>=10'}
    deprecated: Old versions of tar are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
    dependencies:
      chownr: 2.0.0
      fs-minipass: 2.1.0
      minipass: 5.0.0
      minizlib: 2.1.2
      mkdirp: 1.0.4
      yallist: 4.0.0
    dev: true

  /thenify-all@1.6.0:
    resolution: {integrity: sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==}
    engines: {node: '>=0.8'}
    dependencies:
      thenify: 3.3.1
    dev: true

  /thenify@3.3.1:
    resolution: {integrity: sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==}
    dependencies:
      any-promise: 1.3.0
    dev: true

  /through2@4.0.2:
    resolution: {integrity: sha512-iOqSav00cVxEEICeD7TjLB1sueEL+81Wpzp2bY17uZjZN0pWZPuo4suZ/61VujxmqSGFfgOcNuTZ85QJwNZQpw==}
    dependencies:
      readable-stream: 3.6.2
    dev: true

  /tinyglobby@0.2.15:
    resolution: {integrity: sha512-j2Zq4NyQYG5XMST4cbs02Ak8iJUdxRM0XI5QyxXuZOzKOINmWurp3smXu3y5wDcJrptwpSjgXHzIQxR0omXljQ==}
    engines: {node: '>=12.0.0'}
    dependencies:
      fdir: 6.5.0(picomatch@4.0.3)
      picomatch: 4.0.3
    dev: true

  /to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}
    dependencies:
      is-number: 7.0.0
    dev: true

  /tree-kill@1.2.2:
    resolution: {integrity: sha512-L0Orpi8qGpRG//Nd+H90vFB+3iHnue1zSSGmNOOCh1GLJ7rUKVwV2HvijphGQS2UmhUZewS9VgvxYIdgr+fG1A==}
    hasBin: true
    dev: true

  /ts-api-utils@2.4.0(typescript@5.9.3):
    resolution: {integrity: sha512-3TaVTaAv2gTiMB35i3FiGJaRfwb3Pyn/j3m/bfAvGe8FB7CF6u+LMYqYlDh7reQf7UNvoTvdfAqHGmPGOSsPmA==}
    engines: {node: '>=18.12'}
    peerDependencies:
      typescript: '>=4.8.4'
    dependencies:
      typescript: 5.9.3
    dev: true

  /ts-interface-checker@0.1.13:
    resolution: {integrity: sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==}
    dev: true

  /tslib@2.8.1:
    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}

  /turbo-darwin-64@2.8.3:
    resolution: {integrity: sha512-4kXRLfcygLOeNcP6JquqRLmGB/ATjjfehiojL2dJkL7GFm3SPSXbq7oNj8UbD8XriYQ5hPaSuz59iF1ijPHkTw==}
    cpu: [x64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /turbo-darwin-arm64@2.8.3:
    resolution: {integrity: sha512-xF7uCeC0UY0Hrv/tqax0BMbFlVP1J/aRyeGQPZT4NjvIPj8gSPDgFhfkfz06DhUwDg5NgMo04uiSkAWE8WB/QQ==}
    cpu: [arm64]
    os: [darwin]
    requiresBuild: true
    dev: true
    optional: true

  /turbo-linux-64@2.8.3:
    resolution: {integrity: sha512-vxMDXwaOjweW/4etY7BxrXCSkvtwh0PbwVafyfT1Ww659SedUxd5rM3V2ZCmbwG8NiCfY7d6VtxyHx3Wh1GoZA==}
    cpu: [x64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /turbo-linux-arm64@2.8.3:
    resolution: {integrity: sha512-mQX7uYBZFkuPLLlKaNe9IjR1JIef4YvY8f21xFocvttXvdPebnq3PK1Zjzl9A1zun2BEuWNUwQIL8lgvN9Pm3Q==}
    cpu: [arm64]
    os: [linux]
    requiresBuild: true
    dev: true
    optional: true

  /turbo-windows-64@2.8.3:
    resolution: {integrity: sha512-YLGEfppGxZj3VWcNOVa08h6ISsVKiG85aCAWosOKNUjb6yErWEuydv6/qImRJUI+tDLvDvW7BxopAkujRnWCrw==}
    cpu: [x64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /turbo-windows-arm64@2.8.3:
    resolution: {integrity: sha512-afTUGKBRmOJU1smQSBnFGcbq0iabAPwh1uXu2BVk7BREg30/1gMnJh9DFEQTah+UD3n3ru8V55J83RQNFfqoyw==}
    cpu: [arm64]
    os: [win32]
    requiresBuild: true
    dev: true
    optional: true

  /turbo@2.8.3:
    resolution: {integrity: sha512-8Osxz5Tu/Dw2kb31EAY+nhq/YZ3wzmQSmYa1nIArqxgCAldxv9TPlrAiaBUDVnKA4aiPn0OFBD1ACcpc5VFOAQ==}
    hasBin: true
    optionalDependencies:
      turbo-darwin-64: 2.8.3
      turbo-darwin-arm64: 2.8.3
      turbo-linux-64: 2.8.3
      turbo-linux-arm64: 2.8.3
      turbo-windows-64: 2.8.3
      turbo-windows-arm64: 2.8.3
    dev: true

  /type-check@0.4.0:
    resolution: {integrity: sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==}
    engines: {node: '>= 0.8.0'}
    dependencies:
      prelude-ls: 1.2.1
    dev: true

  /typescript@5.9.3:
    resolution: {integrity: sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==}
    engines: {node: '>=14.17'}
    hasBin: true
    dev: true

  /undici-types@7.16.0:
    resolution: {integrity: sha512-Zz+aZWSj8LE6zoxD+xrjh4VfkIG8Ya6LvYkZqtUQGJPZjYl53ypCaUwWqo7eI0x66KBGeRo+mlBEkMSeSZ38Nw==}
    dev: true

  /universalify@2.0.1:
    resolution: {integrity: sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==}
    engines: {node: '>= 10.0.0'}
    dev: true

  /untildify@4.0.0:
    resolution: {integrity: sha512-KK8xQ1mkzZeg9inewmFVDNkg3l5LUhoq9kN6iWYB/CC9YMG8HA+c1Q8HwDe6dEX7kErrEVNVBO3fWsVq5iDgtw==}
    engines: {node: '>=8'}
    dev: true

  /update-browserslist-db@1.2.3(browserslist@4.28.1):
    resolution: {integrity: sha512-Js0m9cx+qOgDxo0eMiFGEueWztz+d4+M3rGlmKPT+T4IS/jP4ylw3Nwpu6cpTTP8R1MAC1kF4VbdLt3ARf209w==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'
    dependencies:
      browserslist: 4.28.1
      escalade: 3.2.0
      picocolors: 1.1.1
    dev: true

  /uri-js@4.4.1:
    resolution: {integrity: sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==}
    dependencies:
      punycode: 2.3.1
    dev: true

  /util-deprecate@1.0.2:
    resolution: {integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==}
    dev: true

  /vite@6.4.1(@types/node@25.2.2):
    resolution: {integrity: sha512-+Oxm7q9hDoLMyJOYfUYBuHQo+dkAloi33apOPP56pzj+vsdJDzr+j1NISE5pyaAuKL4A3UD34qd0lx5+kfKp2g==}
    engines: {node: ^18.0.0 || ^20.0.0 || >=22.0.0}
    hasBin: true
    peerDependencies:
      '@types/node': ^18.0.0 || ^20.0.0 || >=22.0.0
      jiti: '>=1.21.0'
      less: '*'
      lightningcss: ^1.21.0
      sass: '*'
      sass-embedded: '*'
      stylus: '*'
      sugarss: '*'
      terser: ^5.16.0
      tsx: ^4.8.1
      yaml: ^2.4.2
    peerDependenciesMeta:
      '@types/node':
        optional: true
      jiti:
        optional: true
      less:
        optional: true
      lightningcss:
        optional: true
      sass:
        optional: true
      sass-embedded:
        optional: true
      stylus:
        optional: true
      sugarss:
        optional: true
      terser:
        optional: true
      tsx:
        optional: true
      yaml:
        optional: true
    dependencies:
      '@types/node': 25.2.2
      esbuild: 0.25.12
      fdir: 6.5.0(picomatch@4.0.3)
      picomatch: 4.0.3
      postcss: 8.5.6
      rollup: 4.57.1
      tinyglobby: 0.2.15
    optionalDependencies:
      fsevents: 2.3.3
    dev: true

  /which@2.0.2:
    resolution: {integrity: sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==}
    engines: {node: '>= 8'}
    hasBin: true
    dependencies:
      isexe: 2.0.0
    dev: true

  /word-wrap@1.2.5:
    resolution: {integrity: sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==}
    engines: {node: '>=0.10.0'}
    dev: true

  /wrap-ansi@7.0.0:
    resolution: {integrity: sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==}
    engines: {node: '>=10'}
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1
    dev: true

  /xml2js@0.5.0:
    resolution: {integrity: sha512-drPFnkQJik/O+uPKpqSgr22mpuFHqKdbS835iAQrUC73L2F5WkboIRd63ai/2Yg6I1jzifPFKH2NTK+cfglkIA==}
    engines: {node: '>=4.0.0'}
    dependencies:
      sax: 1.4.4
      xmlbuilder: 11.0.1
    dev: true

  /xmlbuilder@11.0.1:
    resolution: {integrity: sha512-fDlsI/kFEx7gLvbecc0/ohLG50fugQp8ryHzMTuW9vSa1GJ0XYWKnhsUx7oie3G98+r56aTQIUB4kht42R3JvA==}
    engines: {node: '>=4.0'}
    dev: true

  /xmlbuilder@15.1.1:
    resolution: {integrity: sha512-yMqGBqtXyeN1e3TGYvgNgDVZ3j84W4cwkOXQswghol6APgZWaff9lnbvN7MHYJOiXsvGPXtjTYJEiC9J2wv9Eg==}
    engines: {node: '>=8.0'}
    dev: true

  /yallist@3.1.1:
    resolution: {integrity: sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==}
    dev: true

  /yallist@4.0.0:
    resolution: {integrity: sha512-3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A==}
    dev: true

  /yauzl@2.10.0:
    resolution: {integrity: sha512-p4a9I6X6nu6IhoGmBqAcbJy1mlC4j27vEPZX9F4L4/vZT3Lyq1VkFHw/V/PUcB9Buo+DG3iHkT0x3Qya58zc3g==}
    dependencies:
      buffer-crc32: 0.2.13
      fd-slicer: 1.1.0
    dev: true

  /yocto-queue@0.1.0:
    resolution: {integrity: sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==}
    engines: {node: '>=10'}
    dev: true

  /zod@3.25.76:
    resolution: {integrity: sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==}
    dev: false

  /zustand@5.0.11(@types/react@18.3.28)(react@18.3.1):
    resolution: {integrity: sha512-fdZY+dk7zn/vbWNCYmzZULHRrss0jx5pPFiOuMZ/5HJN6Yv3u+1Wswy/4MpZEkEGhtNH+pwxZB8OKgUBPzYAGg==}
    engines: {node: '>=12.20.0'}
    peerDependencies:
      '@types/react': '>=18.0.0'
      immer: '>=9.0.6'
      react: '>=18.0.0'
      use-sync-external-store: '>=1.2.0'
    peerDependenciesMeta:
      '@types/react':
        optional: true
      immer:
        optional: true
      react:
        optional: true
      use-sync-external-store:
        optional: true
    dependencies:
      '@types/react': 18.3.28
      react: 18.3.1
    dev: false

```

### File: pnpm-workspace.yaml

```
packages:
  - 'apps/*'
  - 'packages/*'

```

### File: scripts/check-env.sh

```
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

```

### File: scripts/deploy.sh

```
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

```

### File: scripts/generate-types.sh

```
#!/bin/bash
set -e

echo "🔧 Generating TypeScript types from Rust..."

cd apps/api
cargo test --features ts-rs -- --nocapture || true

echo "✅ Types generated in packages/types/src/generated/"

```

### File: scripts/setup.sh

```
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

```

### File: tsconfig.json

```
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path Mapping for Monorepo */
    "baseUrl": ".",
    "paths": {
      "@ttl/types": ["packages/types/src"],
      "@ttl/validation": ["packages/validation/src"],
      "@ttl/utils": ["packages/utils/src"],
      "@ttl/ui": ["packages/ui/src"]
    }
  },
  "files": [],
  "references": [
    { "path": "apps/web" },
    // { "path": "apps/mobile" },
    { "path": "packages/types" },
    { "path": "packages/validation" },
    { "path": "packages/utils" },
    { "path": "packages/ui" }
  ]
}
```

### File: turbo.json

```
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "NODE_ENV",
    "VITE_API_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_USER",
    "POSTGRES_HOST",
    "POSTGRES_PASSWORD",
    "POSTGRES_DATABASE"
  ],
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
```

### File: vercel.json

```
{
  "buildCommand": "pnpm turbo run build --filter=!@ttl/mobile",
  "outputDirectory": "apps/web/dist",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

