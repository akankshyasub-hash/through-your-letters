FROM rust:1.93-slim-bookworm as builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

COPY .sqlx ./.sqlx

COPY src ./src
COPY migrations ./migrations

ENV SQLX_OFFLINE=true

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/api /usr/local/bin/api
COPY --from=builder /app/migrations ./migrations

# Standard Render configuration
ENV RUST_LOG=info
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["/usr/local/bin/api"]