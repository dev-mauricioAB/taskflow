# =========================
# 🏗️ Base stage
# =========================
# Use a lightweight Node 22 base image for all subsequent stages
FROM node:22-slim AS base

# Set working directory for the app
WORKDIR /app


# =========================
# 🧩 Pruner stage
# =========================
# Turbo Prune will copy only the necessary files to build the selected app (web)
FROM base AS pruner

# Install turbo globally to use `turbo prune`
RUN yarn global add turbo

# Copy the entire monorepo
COPY . .

# Prune dependencies for only the web app and its dependencies
# This drastically reduces image size and build time
RUN turbo prune --scope=web --docker


# =========================
# 🧱 Builder stage
# =========================
FROM base AS builder

# Install system dependencies needed by some Node packages
RUN apt-get update && apt-get install -y libc6 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy pruned files from the previous stage
# (Only what’s needed to build "web" will be included)
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/yarn.lock ./yarn.lock
COPY --from=pruner /app/out/full/ ./

# Install dependencies (frozen-lockfile ensures reproducibility)
RUN yarn install --frozen-lockfile

# Build the web app using Turborepo pipeline
RUN yarn turbo run build --filter=web...

# =========================
# 🚀 Runner stage
# =========================
FROM base AS runner

# Set NODE_ENV to production for optimized runtime
ENV NODE_ENV=production

# Create working directory for runtime
WORKDIR /app

# Copy only necessary runtime files from builder
COPY --from=builder /app/apps/web/next.config.mjs ./
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose Next.js default port
EXPOSE 3000

# Start Next.js directly using the binary to avoid missing "start" script issues
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
