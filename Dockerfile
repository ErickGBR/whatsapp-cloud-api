# WhatsApp Sales Bot — Backend API
# Node 22 (maintenance LTS, patched until 2027-04-30). Node 20 reached
# end-of-life on 2026-04-30 and receives no security patches (SEC-N6).

# --- Stage 1: build ---------------------------------------------------------
# Build tools (python3/make/g++) are needed only here, for native deps like
# sqlite3/libsignal when prebuilt binaries are unavailable. The runtime stage
# below stays slim (no compilers, no package manager bloat).
FROM node:22-bookworm-slim AS build

# Native dependency build toolchain
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm globally via npm (corepack may fail in restricted networks)
RUN npm install -g pnpm@9.15.4

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for TypeScript build).
# Note: NODE_ENV is intentionally NOT set here — pnpm would then skip
# devDependencies and the TypeScript build would fail.
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript (generates dist/)
RUN pnpm run build

# Remove dev dependencies after build (production only)
RUN pnpm prune --prod

# --- Stage 2: runtime -------------------------------------------------------
FROM node:22-bookworm-slim

# Production mode (SEC-N3): fail fast on missing JWT_SECRET / ADMIN_EMAIL /
# ADMIN_PASSWORD instead of silently falling back to development defaults.
ENV NODE_ENV=production

WORKDIR /app

# Production-only dependencies (already pruned) and compiled output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Create required directories
RUN mkdir -p /app/data /app/logs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
