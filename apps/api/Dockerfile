FROM rust:1.93-slim-bookworm as builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/api /usr/local/bin/api
COPY --from=builder /app/migrations /migrations

ENV RUST_LOG=info
EXPOSE 3000

CMD ["api"]