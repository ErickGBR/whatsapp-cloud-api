# WhatsApp Sales Bot — Unified Backend + Dashboard
# Single Docker image serving both the Express API and the compiled Vite dashboard.
# Node 22 (maintenance LTS, patched until 2027-04-30). Node 20 reached
# end-of-life on 2026-04-30 and receives no security patches (SEC-N6).

# --- Stage 1: build backend --------------------------------------------------
# Build tools (python3/make/g++) are needed only here, for native deps like
# sqlite3/libsignal when prebuilt binaries are unavailable.
FROM node:22-bookworm-slim AS backend-build

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update -o Acquire::Retries=3 \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# yarn 1.22.22 is pre-installed in node:22-bookworm-slim

# Copy dependency manifests
COPY package.json yarn.lock ./

# Install ALL dependencies (including devDependencies for TypeScript build).
# NODE_ENV is intentionally NOT set here — yarn would then skip
# devDependencies and the TypeScript build would fail.
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript (generates dist/)
RUN yarn build

# Prune dev dependencies after build (production only)
RUN yarn install --frozen-lockfile --production

# --- Stage 2: build dashboard ------------------------------------------------
FROM node:22-bookworm-slim AS dashboard-build

WORKDIR /dashboard

# yarn 1.22.22 is pre-installed in node:22-bookworm-slim

# Copy dependency manifests
COPY dashboard/package.json dashboard/yarn.lock ./

# Install dependencies (devDeps needed for vite build)
RUN yarn install --frozen-lockfile

# Copy dashboard source
COPY dashboard/ ./

# Build the Vite + React app (output: /dashboard/dist)
RUN yarn build

# --- Stage 3: runtime --------------------------------------------------------
FROM node:22-bookworm-slim

# Production mode (SEC-N3): fail fast on missing JWT_SECRET / ADMIN_EMAIL /
# ADMIN_PASSWORD instead of silently falling back to development defaults.
ENV NODE_ENV=production

# The backend serves the compiled dashboard from this directory.
ENV DASHBOARD_STATIC_DIR=/app/public

WORKDIR /app

# Production-only dependencies and compiled output
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/package.json ./

# Compiled dashboard assets (served by the backend)
COPY --from=dashboard-build /dashboard/dist ./public

# Create required directories and non-root user (SEC-M1)
RUN mkdir -p /app/data /app/logs \
    && groupadd -r appgroup && useradd -r -g appgroup -s /bin/false appuser \
    && chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
