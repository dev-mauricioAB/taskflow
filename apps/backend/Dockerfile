# ===========================
#  Stage 1: Base
# ===========================
FROM node:22-slim AS base
WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# ===========================
#  Stage 2: Prune monorepo for backend
# ===========================
FROM base AS pruner

# Install Turbo globally
RUN npm install -g turbo

# Copy only manifests and turbo config files
COPY turbo.json package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/*/

# Prune dependencies for backend only
RUN turbo prune --scope=backend --docker

# ===========================
#  Stage 3: Install dependencies
# ===========================
FROM base AS installer
WORKDIR /app

# Copy pruned JSON + full pruned source (local packages included)
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/full/ ./

# Install dependencies using npm (local packages now exist)
RUN npm ci

# ===========================
#  Stage 4: Build backend
# ===========================
FROM base AS builder
WORKDIR /app

# Copy installed node_modules + full source
COPY --from=installer /app ./

# Build backend only
RUN npx turbo run build --filter=backend...

# ===========================
#  Stage 5: Final runtime
# ===========================
FROM node:22-slim AS final
WORKDIR /app

# Optional: non-root user
RUN useradd -m backenduser
USER backenduser

# Copy built app and production dependencies
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/package.json ./

# Expose backend port
EXPOSE 4000

# Start backend
CMD ["node", "apps/backend/dist/index.js"]
