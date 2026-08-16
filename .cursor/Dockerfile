# GenCore cloud agent environment: Node 22 + Rust stable + Tauri 2 Linux build deps.
# build.context (see environment.json) is the repo root; this file is at .cursor/Dockerfile.
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    CARGO_HOME=/usr/local/cargo \
    RUSTUP_HOME=/usr/local/rustup \
    PATH=/usr/local/cargo/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    file \
    git \
    ca-certificates \
    pkg-config \
    patchelf \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libxdo-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal \
    && rustup component add rustfmt clippy

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /workspace
