# ============================================
# Stage 1: Build the Vite + React app
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies (clean install for reproducibility)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the production bundle
RUN npm run build

# ============================================
# Stage 2: Serve via nginx
# ============================================
FROM nginx:alpine

# Copy custom nginx config (handles SPA fallback + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# nginx starts automatically via default CMD
CMD ["nginx", "-g", "daemon off;"]
