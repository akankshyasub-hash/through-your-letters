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
