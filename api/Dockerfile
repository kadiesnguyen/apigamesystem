# ============================================
# Dockerfile for API Server (Bun Runtime)
# ============================================
# Port: 3300 (HTTP API for CMS backend)
# ============================================

# Stage 1: Build stage
FROM oven/bun:1.2-alpine AS builder

# Ensure bun is executable
RUN chmod +x /usr/local/bin/bun

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun build src/server.ts --outdir dist --target bun

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
    adduser -S apiserver -u 1001 -G nodejs && \
    chown -R apiserver:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3300

# Expose port
EXPOSE 3300

# Switch to non-root user
USER apiserver

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3300/api/health || exit 1

# Start the application
CMD ["bun", "run", "dist/server.js"]