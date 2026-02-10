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
