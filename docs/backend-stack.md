# Backend stack (API app)

The API is an Express app in `apps/api`. This document covers **routes**, **controllers**, **middlewares**, and **config**. For architecture and data flow, see [Architecture](architecture.md) and [Data flow](data-flow.md).

## Routes

Entry point: `apps/api/src/routes/api.routes.ts`. The main app mounts the API router at `/api` (see `apps/api/src/app.ts`).

- **Public (before auth):** `POST /api/users/with-keycloak` — signup with Keycloak; uses `validate({ body: CreateKeycloakUserDto })`.
- **Protected (after auth):** Everything under `apiRouter.use(protect())`: `/api/tasks`, `/api/users`, `/api/projects`, `/api/activity` are mounted as resource routers.

Resource routers:

| Router         | File                 | Mount path  |
| -------------- | -------------------- | ----------- |
| userRouter     | `user.routes.ts`     | `/users`    |
| taskRouter     | `task.routes.ts`     | `/tasks`    |
| projectRouter  | `project.routes.ts`  | `/projects` |
| activityRouter | `activity.routes.ts` | `/activity` |

Each route file defines HTTP methods and applies `validate` with the appropriate DTO for body, query, or params. Example (user): `GET /` (offset list), `GET /cursor` (cursor list), `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/reactivate`. Typed route helpers (`withBody`, `withQuery`, `withParams`, `withParamsAndBody`) from `apps/api/src/utils/typed-route.ts` keep controller signatures type-safe.

## Controllers

One controller per resource in `apps/api/src/controllers/`:

| Controller         | File                     | Responsibility                                                                                    |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| UserController     | `user.controller.ts`     | Instantiate UserRepository and user use cases; map HTTP requests to use case calls and responses. |
| TaskController     | `task.controller.ts`     | Same for tasks.                                                                                   |
| ProjectController  | `project.controller.ts`  | Same for projects.                                                                                |
| ActivityController | `activity.controller.ts` | Same for activities.                                                                              |

Controllers hold no business logic: they call use cases (e.g. `this.createUserUC.execute(req.body)`) and send JSON with the appropriate status (e.g. 201 for create, 200 for read/list). Errors are forwarded with `next(err)` so the error middleware can handle `DomainError` and other failures. Dependencies (repositories, Keycloak admin client) are created in the controller and passed into use case constructors.

## Middlewares

Located in `apps/api/src/infra/http/middlewares/`.

| Middleware   | File                             | Role                                                                                                                                                                                                                              |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| validate     | `validate-request.middleware.ts` | Accepts `{ body?, query?, params? }` with Zod schemas; parses and assigns back to `req.body`, `req.query`, `req.params`. On ZodError, passes a `DomainError` with code `VALIDATION_FAILED` to `next()`.                           |
| errorHandler | `error-handler.middleware.ts`    | Central error handler. For `DomainError`, responds with status (e.g. 404, 409, 400) and body `{ error, code, details? }`. Handles Prisma errors (P2002, P2025) and Keycloak-related errors. Falls back to 500 for unknown errors. |
| logger       | `logging.middleware.ts`          | Request logging (e.g. method, path, duration).                                                                                                                                                                                    |

Order in `app.ts`: session, Keycloak, cors, json, logger; then `/api` router; then `errorHandler` last so any `next(err)` is caught.

## Config

Configuration lives in `apps/api/src/config/`.

| File                 | Purpose                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `index.ts`           | Barrel or aggregate config export.                                                                                 |
| `env.config.ts`      | Load and validate environment variables.                                                                           |
| `server.config.ts`   | Server port and host.                                                                                              |
| `database.config.ts` | Database connection (e.g. for Prisma URL).                                                                         |
| `keycloak.config.ts` | Keycloak realm, server URL, client id, etc.                                                                        |
| `keycloak-admin.ts`  | Keycloak Admin Client setup (e.g. `authKeycloakAdmin`, `kcAdmin`) used by controllers and use cases for user sync. |

Keycloak protection and role checks are wired in `apps/api/src/keycloak.ts` (e.g. `protect()`, `protectRole(...)`). The Express app is built in `app.ts` and started in `server.ts`.
