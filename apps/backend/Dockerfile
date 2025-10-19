# -------------------------------
# 🌱 BASE IMAGE
# -------------------------------
# Use the lightweight Node.js image as the base for all stages.
# 'slim' keeps the image smaller but requires us to manually install dependencies like OpenSSL.
FROM node:22-slim AS base

# -------------------------------
# 🏗️ BUILDER STAGE
# -------------------------------
# This stage handles pruning the monorepo using TurboRepo.
# It copies the full repo, installs Turbo, and prunes everything
# that’s not needed to build the backend (and its dependencies).
FROM base AS builder

# Install libc (required for Prisma’s native engine)
RUN apt-get update && apt-get install -y libc6 && rm -rf /var/lib/apt/lists/*

# Define working directory
WORKDIR /app

# Install Turbo globally (used to build and prune workspaces)
RUN yarn global add turbo

# Copy entire monorepo into the container
COPY . .

# 🧹 Prune only what's necessary for the backend app and its dependencies
RUN turbo prune backend --docker

# -------------------------------
# 📦 INSTALLER STAGE
# -------------------------------
# This stage installs dependencies, generates the Prisma client,
# and builds the backend (and its shared packages).
FROM base AS installer
WORKDIR /app

# Install system-level dependencies required by Prisma
# - openssl + libssl-dev: required for Prisma query engine binaries
# - libc6: required for Node.js runtime and native modules
RUN apt-get update && apt-get install -y libc6 openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy pruned package manifests (only package.json, lockfiles, etc.)
COPY --from=builder /app/out/json/ .

# 🧩 Install dependencies for backend and all referenced workspaces (e.g., @repo/infra)
RUN yarn install --frozen-lockfile

# Copy actual source code for backend and its dependencies
COPY --from=builder /app/out/full/ .

# -----------------------------------
# ⚙️ GENERATE PRISMA CLIENT (infra)
# -----------------------------------
# Prisma is located in packages/infra, so we move there before generating.
# This step ensures @prisma/client is built and available at runtime.
WORKDIR /app/packages/infra
RUN npx prisma generate --schema=./prisma/schema.prisma

# Return to project root
WORKDIR /app

# 🧱 Build backend and its dependencies using Turbo
RUN yarn turbo run build --filter=backend...

# -------------------------------
# 🚀 RUNNER STAGE
# -------------------------------
# This stage creates the final, lightweight runtime image.
FROM base AS runner
WORKDIR /app

# Install runtime-only dependencies for Prisma (no build tools)
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy everything from installer (includes node_modules + built dist files)
COPY --from=installer /app .

# 👤 Create a non-root user for better container security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
USER nodejs

# -------------------------------
# 🏁 START COMMAND
# -------------------------------
# Run the compiled backend application
CMD ["node", "apps/backend/dist/server.js"]
