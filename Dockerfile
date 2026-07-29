# WhatsApp Sales Bot — Backend API
FROM node:18-alpine

WORKDIR /app

# Install system dependencies needed for SQLite and other tools
RUN apk add --no-cache python3 make g++ sqlite

# Enable pnpm via corepack (uses version from packageManager in package.json)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript (generates dist/)
RUN pnpm run build

# Remove dev dependencies after build (production only)
RUN pnpm prune --prod

# Create required directories
RUN mkdir -p /app/data /app/logs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
