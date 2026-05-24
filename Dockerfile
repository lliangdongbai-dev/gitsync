# ========================================
# Stage 1: Build frontend
# ========================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files and install dependencies
COPY client/package.json client/package-lock.json* ./
RUN npm ci

# Copy client source and build
COPY client/ ./
RUN npm run build

# ========================================
# Stage 2: Build backend
# ========================================
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files and install dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm ci

# Copy server source and build
COPY server/ ./
RUN npm run build

# ========================================
# Stage 3: Runtime
# ========================================
FROM node:20-alpine AS runtime

# Install git and openssh-client for git operations
RUN apk add --no-cache git openssh-client

WORKDIR /app

# Copy server package files and install production dependencies only
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# Copy built server files
COPY --from=server-builder /app/server/dist ./dist

# Copy built client files
COPY --from=client-builder /app/client/dist ./client/dist

# Create data directories
RUN mkdir -p /app/data/repos /app/data/ssh_keys

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/gitsync.db
ENV REPO_DIR=/app/data/repos
ENV SSH_KEY_DIR=/app/data/ssh_keys

# Start the server
CMD ["node", "dist/index.js"]
