# Infra package (`@repo/infra`)

The infra package provides **infrastructure**: repository implementations (Prisma), **interfaces (ports)** for persistence and events, the Prisma client and error mapping, the **event bus**, and **domain errors**. The API and core packages depend on it; core depends only on its interfaces, not on Prisma or transport details.

## Interfaces (ports)

Located in `packages/infra/src/interfaces/`. These define the contracts that use cases depend on.

| Interface | File | Description |
| ----------- | ------ | ------------- |
| IRepository&lt;T, ID&gt; | `IRepository.ts` | Generic port: `create`, `save`, `delete`, `findById`, `softDelete`, `hardDelete`, `exists`, `isSoftDeleted`, `update`. Includes `NewEntity<T>` for create input. |
| IUserRepository | `IUserRepository.ts` | Extends `IRepository<User, string>`. Adds `findAll` (offset), `findAllCursor` (cursor), `reactivate`, `findByEmail`. |
| ITaskRepository | `ITaskRepository.ts` | Task-specific list and find methods. |
| IProjectRepository | `IProjectRepository.ts` | Project-specific list and find methods. |
| IActivityRepository | `IActivityRepository.ts` | Activity-specific methods. |
| IEventPublisher | `IEventPublisher.ts` | Publish domain events (e.g. for use cases to notify subscribers). |

Barrel: `interfaces/index.ts`. Core imports these; the API wires concrete implementations (repositories, event bus publisher) when constructing use cases.

## Repositories

Implementations live in `packages/infra/src/repositories/`. Each repository implements the corresponding interface using the Prisma client.

| Repository | File | Implements |
| ------------ | ------ | ------------ |
| UserRepository | `user.repository.ts` | IUserRepository |
| TaskRepository | `task.repository.ts` | ITaskRepository |
| ProjectRepository | `project.repository.ts` | IProjectRepository |
| ActivityRepository | `activity.repository.ts` | IActivityRepository |

Shared helpers (e.g. for cursor/offset pagination or query building) are in `repositories/helpers.ts`. Repositories use the Prisma client from `database/prisma.client.ts` and map Prisma errors to `DomainError` (via `prisma-error-mapper.ts` or decorators in `database/decorators/handle-prisma-errors.ts`).

Barrel: `repositories/index.ts`.

## Database (ORM)

| Item | Path | Description |
| ------ | ------ | ------------- |
| Prisma schema | `packages/infra/prisma/schema.prisma` | Models (User, Project, Task, Activity, etc.), enums, relations. |
| Prisma client | `packages/infra/src/database/prisma.client.ts` | Singleton client used by repositories. |
| Error mapping | `packages/infra/src/database/prisma-error-mapper.ts` | Maps Prisma errors (e.g. P2002, P2025) to `DomainError` with appropriate code and status. |
| Decorators | `packages/infra/src/database/decorators/handle-prisma-errors.ts` | Optional decorator to wrap repository methods and convert Prisma errors to domain errors. |

Commands (run from infra package or root): `db:generate` (Prisma generate), `db:migrate` (migrate dev). The API may run migrations in Docker (e.g. `prisma migrate deploy`).

## Event bus

The event bus is an in-memory publish/subscribe implementation that use cases use to publish domain events; subscribers (in `@repo/core`) register with it.

| Item | Path | Description |
| ------ | ------ | ------------- |
| EventBus | `packages/infra/src/event-bus/EventBus.ts` | `dispatch(event, arg)` and `register(event, callback)`; returns a registry with `unregister()`. |
| EventBusPublisher | `packages/infra/src/event-bus/EventBusPublisher.ts` | Implements `IEventPublisher`; forwards to the shared EventBus instance. |
| Barrel | `packages/infra/src/event-bus/index.ts` | Exports `eventBus` (singleton) and `eventBusPublisher` for use in API and core. |

Design is RabbitMQ-ready: the same interface could be backed by a message broker later.

## Errors

| Item | Path | Description |
| ------ | ------ | ------------- |
| DomainError | `packages/infra/src/errors/DomainError.ts` | Error class with `code` (from `@repo/shared` ErrorCode), `message`, optional `details`, `cause`, and `status`. |
| Barrel | `packages/infra/src/errors/index.ts` | Re-exports for `@repo/infra`. |

Use cases and repositories throw `DomainError` for business and persistence failures. The API error middleware checks for `DomainError` and responds with the appropriate HTTP status and body (`code`, `message`, `details`). Error codes and status mapping are defined in `@repo/shared` (e.g. `ERROR_CODES`, `httpStatusByCode`).
