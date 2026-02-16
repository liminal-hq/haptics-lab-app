FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ARG PNPM_VERSION=10.29.3

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    file \
    git \
    gnupg \
    libayatana-appindicator3-dev \
    libglib2.0-dev \
    libgtk-3-dev \
    librsvg2-dev \
    libssl-dev \
    libwebkit2gtk-4.1-dev \
    pkg-config \
    wget \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x and pin pnpm to match package.json.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm@${PNPM_VERSION} \
    && rm -rf /var/lib/apt/lists/*

# Install Rust stable with clippy and rustfmt.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && /root/.cargo/bin/rustup component add clippy rustfmt

ENV PATH=/root/.cargo/bin:$PATH
