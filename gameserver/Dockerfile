# ============================================
# Dockerfile for Game Server (Bun Runtime)
# ============================================
# Ports: 
#   - 3000: HTTP API
#   - 3001: WebSocket
# ============================================

# Stage 1: Build stage
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Fix Kaniko permission issues with executables
RUN chmod +x /usr/local/bin/bun || true && \
    find /usr/local/bin -type f -exec chmod +x {} \; || true

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (skip scripts to avoid permission issues with native modules)
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN bun build src/index.ts --outdir dist --target bun

# ============================================
# Stage 2: Production stage
# ============================================
FROM oven/bun:1.2-alpine AS production

WORKDIR /app

# Copy built artifacts from builder stage (no node_modules needed - code is bundled)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gameserver -u 1001 -G nodejs && \
    chown -R gameserver:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose ports (HTTP API: 3000, WebSocket: 3001)
EXPOSE 3000 3001

# Switch to non-root user
USER gameserver

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "dist/index.js"]