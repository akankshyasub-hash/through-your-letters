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
