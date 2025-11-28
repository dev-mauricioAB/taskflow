# syntax=docker/dockerfile:1.5.2

# ---- Base (with turbo) ----
FROM node:20-bookworm-slim AS base
WORKDIR /repo
ENV NODE_ENV=production
# Turbo for prune/build orchestration
RUN npm i -g turbo

# Copy the full repo and prune to just what's needed for backend
COPY . .
RUN turbo prune --scope=backend --docker

# ---- Dependencies ----
FROM node:20-bookworm-slim AS deps
WORKDIR /repo

# Bring pruned package manifests and lockfile
COPY --from=base /repo/out/json/ .
COPY --from=base /repo/out/yarn.lock ./yarn.lock

# Ensure Yarn is available and version-matched via Corepack
RUN corepack enable

# Install dependencies for the pruned graph with modern Yarn flags
RUN yarn install --immutable --immutable-cache

# ---- Build ----
FROM node:20-bookworm-slim AS build
WORKDIR /repo

# Bring node_modules from deps and pruned source from base
COPY --from=deps /repo .
COPY --from=base /repo/out/full/ .

ENV NODE_ENV=production

# Generate Prisma Client inside the infra workspace (shared instance)
WORKDIR /repo/packages/infra
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build backend and its workspace deps
WORKDIR /repo
RUN yarn run turbo run build --filter=backend...

# ---- Runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL 3 runtime libraries
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system nodegrp && adduser --system --ingroup nodegrp nodeusr

# Copy backend compiled output
COPY --from=build /repo/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist

# Copy shared package outputs used at runtime
COPY --from=build /repo/packages/core/package.json ./packages/core/package.json
COPY --from=build /repo/packages/core/dist ./packages/core/dist
COPY --from=build /repo/packages/infra/package.json ./packages/infra/package.json
COPY --from=build /repo/packages/infra/dist ./packages/infra/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
# Optional: include schema directory if desired
COPY --from=build /repo/packages/infra/prisma ./packages/infra/prisma

# Copy node_modules including generated Prisma client and engines
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules

USER nodeusr
EXPOSE 8080
CMD ["node", "apps/backend/dist/server.js"]
