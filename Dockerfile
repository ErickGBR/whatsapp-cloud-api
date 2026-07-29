# WhatsApp Sales Bot — Backend API
FROM node:20-bookworm

WORKDIR /app

# Install pnpm globally via npm (corepack may fail in restricted networks)
RUN npm install -g pnpm@9.15.4

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
