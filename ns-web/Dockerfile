# Web interface build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY ns-web/package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY ns-web ./

# Build for production
RUN npm run build

# Production server
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY ns-web/nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3010/health || exit 1

# Expose port
EXPOSE 3010

CMD ["nginx", "-g", "daemon off;"]
