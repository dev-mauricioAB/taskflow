# Monorepo

TaskFlow uses **Yarn workspaces** and **Turborepo** for a single repo containing multiple apps and shared packages. This document covers workspaces, package roles, build order, key paths, and scripts.

## Workspaces

Defined in the root `package.json`:

```json
"workspaces": ["apps/*", "packages/*"]
```

### Apps

| Package    | Role                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/api` | Express API: routes, controllers, middlewares, Keycloak; depends on `@repo/core`, `@repo/infra`, `@repo/shared`. |
| `apps/web` | Next.js frontend (App Router); consumes API and shared types/UI.                                                 |

### Packages

| Package                      | Role                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@repo/core`                 | Use cases and subscribers; application logic only; depends on `@repo/shared`, `@repo/infra` (for interfaces).  |
| `@repo/infra`                | Repositories (Prisma), interfaces (ports), event bus, database client, error types; depends on `@repo/shared`. |
| `@repo/shared`               | DTOs, Zod schemas, entities, events, shared types; no internal workspace deps (only Zod, TypeScript config).   |
| `@repo/ui`                   | Shared UI components.                                                                                          |
| `packages/vitest-config`     | Shared Vitest configuration.                                                                                   |
| `packages/typescript-config` | Shared TypeScript base config.                                                                                 |
| `packages/eslint-config`     | Shared ESLint config.                                                                                          |

## Build order

Dependencies flow so that shared types and infra ports are built before application and API:

1. **@repo/shared** — No workspace dependencies; build first.
2. **@repo/infra** — Depends on `@repo/shared`; implements repositories and ports.
3. **@repo/core** — Depends on `@repo/shared`, `@repo/infra`; use cases and subscribers.
4. **apps/api** — Depends on `@repo/core`, `@repo/infra`, `@repo/shared`; wires and runs the API.

Turbo respects this via the dependency graph. To build only the backend dependency chain:

```bash
yarn bd:deps
```

This runs: `turbo run build --filter=@repo/infra... --filter=@repo/shared... --filter=@repo/core...` (build infra, shared, core and their dependents).

## Key paths

| What                       | Where                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use cases                  | `packages/core/src/use-cases/` — per aggregate: `user/`, `task/`, `project/`, `activity/`; each has Create, Update, Delete, GetById, GetOffset, GetCursor, etc. |
| Subscribers                | `packages/core/src/subscribers/` — user, task, project, activity logging.                                                                                       |
| Repositories               | `packages/infra/src/repositories/` — user, task, project, activity; helpers for pagination.                                                                     |
| Interfaces (ports)         | `packages/infra/src/interfaces/` — `IRepository`, `IUserRepository`, `ITaskRepository`, `IProjectRepository`, `IActivityRepository`, `IEventPublisher`.         |
| Routes                     | `apps/api/src/routes/` — `api.routes.ts` (mount), `user.routes.ts`, `task.routes.ts`, `project.routes.ts`, `activity.routes.ts`.                                |
| Controllers                | `apps/api/src/controllers/` — one per resource; call use cases.                                                                                                 |
| Middlewares                | `apps/api/src/infra/http/middlewares/` — validate, error-handler, logging.                                                                                      |
| DTOs & schemas             | `packages/shared/src/dtos/`, `packages/shared/src/schemas/` — Zod DTOs and reusable schemas.                                                                    |
| Entities & events          | `packages/shared/src/entities/`, `packages/shared/src/events/` — domain shapes and event names/payloads.                                                        |
| Prisma schema              | `packages/infra/prisma/schema.prisma` — models and migrations.                                                                                                  |
| Prisma client & DB helpers | `packages/infra/src/database/` — client, error mapper, decorators.                                                                                              |

## Scripts (root)

| Script             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `yarn build`       | `turbo run build` — build all workspaces.              |
| `yarn dev`         | `turbo run dev` — run dev mode for all.                |
| `yarn lint`        | `turbo run lint` — lint all.                           |
| `yarn test`        | `turbo run test` — run tests in all workspaces.        |
| `yarn check-types` | `turbo run check-types` — type-check.                  |
| `yarn format`      | Prettier on `**/*.{ts,tsx,md}`.                        |
| `yarn run:api`     | `turbo run dev --filter=api` — run API dev server.     |
| `yarn run:web`     | `turbo run dev --filter=web` — run Next.js dev server. |
| `yarn bd:deps`     | Build backend dependency chain (shared, infra, core).  |

Run these from the repo root. Per-package scripts (e.g. `build`, `test`) are defined in each workspace’s `package.json`.
