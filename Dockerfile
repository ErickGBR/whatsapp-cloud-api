# WhatsApp Sales Bot — Backend API with embedded Redis
FROM node:20-bookworm

# Install Redis and supervisor
RUN apt-get update && apt-get install -y redis-server supervisor && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json yarn.lock ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript (generates dist/)
RUN yarn build

# Remove dev dependencies after build (production only)
RUN yarn install --production --frozen-lockfile --ignore-scripts || true

# Create required directories
RUN mkdir -p /app/data /app/logs

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports (app + Redis)
EXPOSE 3000 6379

# Start supervisor (manages both Redis and the app)
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
