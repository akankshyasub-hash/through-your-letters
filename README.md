# Through The Letters - Bengaluru Street Typography Archive

**A collaborative archive documenting the disappearing world of street lettering in Indian cities.**

## 🎯 100% Free Deployment

Deploy the entire stack for **$0/month**:
- ✅ Backend: Render (Free tier - 750 hours/month)
- ✅ Frontend: Vercel (Free tier - unlimited)
- ✅ Database: Supabase (Free tier - 500 MB)
- ✅ Redis: Upstash (Free tier - 10k commands/day)
- ✅ Storage: Cloudflare R2 (Free tier - 10 GB)

**Supports**: 500-1,000 Daily Active Users

## 🚀 Quick Start

```bash
# Extract archive
tar -xzf through-the-letters-COMPLETE.tar.gz
cd COMPLETE-FINAL-ALL-FILES

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

## 📦 What's Included

- ✅ Complete backend (60+ Rust files)
- ✅ Complete frontend (30+ React files)
- ✅ Mobile app (iOS + Android ready)
- ✅ CI/CD (GitHub Actions)
- ✅ Docker setup
- ✅ All documentation
- ✅ Free deployment configs

**Total**: 159 production-ready files

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

Perfect for MVP and early growth!

## 🚢 Deploy Now

```bash
# 1. Create accounts (all free):
#    - render.com
#    - vercel.com  
#    - supabase.com
#    - upstash.com
#    - cloudflare.com

# 2. Follow deployment guide
cat docs/DEPLOYMENT.md

# 3. Push to GitHub
git push origin main

# 4. Render + Vercel auto-deploy
# 5. You're live! 🎉
```

## 💰 Cost Breakdown

- Backend (Render): $0
- Frontend (Vercel): $0
- Database (Supabase): $0
- Redis (Upstash): $0
- Storage (R2): $0
- CDN (Cloudflare): $0

**Total: $0/month** ✅

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

**Built with ❤️ for preserving urban typography**
