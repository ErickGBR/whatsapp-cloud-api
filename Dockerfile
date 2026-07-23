# WhatsApp Sales Bot — Backend API
FROM node:18-alpine

WORKDIR /app

# Install system dependencies needed for SQLite and other tools
RUN apk add --no-cache python3 make g++ sqlite

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create required directories
RUN mkdir -p /app/data /app/logs

# Expose port
EXPOSE 3000

# Command to start the application
CMD ["node", "dist/server.js"]

