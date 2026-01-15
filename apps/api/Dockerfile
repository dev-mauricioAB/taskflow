# syntax=docker/dockerfile:1.5.2

# ---- Base (with turbo) ----
FROM node:20-bookworm-slim AS base
WORKDIR /repo
ENV NODE_ENV=production
# Turbo for prune/build orchestration
RUN npm i -g turbo

# Copy the full repo and prune to just what's needed for api
COPY . .
RUN turbo prune --scope=api --docker

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

# Receive build-time DATABASE_URL
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ENV NODE_ENV=production

# Bring node_modules from deps and pruned source from base
COPY --from=deps /repo .
COPY --from=base /repo/out/full/ .

# Generate Prisma Client inside the infra workspace (shared instance)
WORKDIR /repo/packages/infra
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build api and its workspace deps
WORKDIR /repo
RUN yarn run turbo run build --filter=api...

# ---- Runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Accept DATABASE_URL at build-time (optional) and keep as env
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Install OpenSSL 3 runtime libraries
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system nodegrp && adduser --system --ingroup nodegrp nodeusr

# Copy api compiled output
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist

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
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules

USER nodeusr
EXPOSE 8080
CMD ["node", "apps/api/dist/server.js"]
