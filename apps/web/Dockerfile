# syntax=docker/dockerfile:1.5.2

# ---- Base with turbo ----
FROM node:20-alpine AS base
WORKDIR /repo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm i -g turbo

# Copy monorepo and prune to web scope
COPY . .
RUN turbo prune --scope=web --docker

# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /repo
COPY --from=base /repo/out/json/ .
COPY --from=base /repo/out/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile --prefer-offline

# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo .
COPY --from=base /repo/out/full/ .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Ensure standalone output
# If you added output:'standalone' to next.config.mjs, this will generate .next/standalone
RUN yarn turbo run build --filter=web...

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

# Copy public assets
COPY --from=build /repo/apps/web/public ./public

# Copy standalone server and static assets
# Note: Next writes .next/standalone with the workspace path inside it.
# The standalone folder contains a full app tree with a server.js entry at the app root inside that tree.
COPY --from=build --chown=nodeusr:nodegrp /repo/apps/web/.next/standalone ./standalone
COPY --from=build --chown=nodeusr:nodegrp /repo/apps/web/.next/static ./.next/static

USER nodeusr
EXPOSE 3000
ENV PORT=3000

# Start the standalone server entry. The server.js lives under the workspace subfolder within standalone.
# For a workspace at apps/web, the entry is: standalone/apps/web/server.js
CMD ["node", "standalone/apps/web/server.js"]
