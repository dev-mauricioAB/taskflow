# Shared package (`@repo/shared`)

The shared package holds **cross-cutting types and schemas** used by the API, core, and infra: **DTOs** (Zod-validated API input), **Zod schemas** (reusable building blocks), **entities** (domain-shaped types), **events** (event names and payload types), and **types** (pagination, sort, error codes, HTTP status, API response). It has no workspace dependencies other than Zod and the TypeScript config.

## DTOs

DTOs are Zod schemas used for API input (body, query, params). They live in `packages/shared/src/dtos/`. Each module typically exports both the schema (e.g. `CreateUserDto`) and the inferred TypeScript type (e.g. `TCreateUserDto`).

| File | Contents |
| ------ | ---------- |
| `users.dto.ts` | CreateUserDto, UpdateUserDto, UserParamsDto, UserQueryDto; types TCreateUserDto, TUpdateUserDto, TUserParamsDto, TUserQueryDto. |
| `user-pagination.dto.ts` | Offset and cursor pagination for users (TUserOffsetPagination, TUserCursorPagination). |
| `tasks.dto.ts` | Task create/update/params/query DTOs and types. |
| `task-pagination.dto.ts` | Task list pagination DTOs. |
| `projects.dto.ts` | Project DTOs and types. |
| `activities.dto.ts` | Activity DTOs and types. |
| `create-keycloak-user.dto.ts` | CreateKeycloakUserDto, TCreateKeycloakUserDto (for Keycloak-backed signup). |
| `common.dto.ts` | Shared DTO fragments or common fields. |
| `index.ts` | Barrel exporting all DTOs. |

The API `validate` middleware uses these schemas (e.g. `validate({ body: CreateUserDto })`). Controllers and use cases use the inferred types for typed request bodies and params.

## Schemas

Reusable Zod building blocks in `packages/shared/src/schemas/`. Used by DTOs and by validation at the API edge.

| File | Contents |
| ------ | ---------- |
| `user.schema.ts` | Id (uuid), ISODate (coerce date), UserSchema (id, keycloakUserId, name, email, createdAt, updatedAt); TUser. |
| `task.schema.ts` | Task-related schemas and types. |
| `project.schema.ts` | Project-related schemas and types. |
| `activity.schema.ts` | Activity-related schemas and types. |
| `index.ts` | Barrel. |

Schemas define primitives (e.g. Id, ISODate) and entity-shaped objects; DTOs compose them and add strict() or optional fields as needed for API boundaries.

## Entities

Domain-shaped types in `packages/shared/src/entities/`. They align with the concepts used in use cases and repositories; they may mirror Prisma model shapes but stay in shared so core and infra both reference the same types.

| File | Contents |
| ------ | ---------- |
| `user.entity.ts` | User entity type. |
| `task.entity.ts` | Task entity type. |
| `project.entity.ts` | Project entity type. |
| `activity.entity.ts` | Activity entity type. |
| `index.ts` | Barrel. |

Used by repository interfaces (e.g. `IRepository<User, string>`) and by use case input/output types.

## Events

Event names and payload types for the event bus. Use cases publish these; subscribers consume them. Defined in `packages/shared/src/events/`.

| File | Example contents |
| ------ | ------------------ |
| `user.ts` | USER_CREATED, USER_UPDATED, USER_DELETED; UserCreatedPayload, UserUpdatedPayload, UserDeletedPayload. |
| `task.ts` | Task event names and payloads. |
| `projects.ts` | Project event names and payloads. |
| `activity.ts` | Activity event names and payloads. |
| `index.ts` | Barrel. |

Infra’s event bus and publisher are transport-agnostic; shared only defines the event contract (name + payload type).

## Types

Shared TypeScript types and constants in `packages/shared/src/types/`.

| File | Description |
| ------ | ------------- |
| `pagination.ts` | Offset and cursor list params and page result types (e.g. OffsetPage, CursorPage, OffsetListParams, CursorListParams). |
| `sort.ts` | Sort direction and sort-by types. |
| `errors-code.ts` | ERROR_CODES constant and ErrorCode type (NOT_FOUND, VALIDATION_FAILED, EMAIL_IN_USE, etc.). |
| `http-status-code.ts` | HTTP status code mapping or constants. |
| `api-response.ts` | Generic API response shape if used across the API. |
| `query-keys.ts` | Query keys for client caching (e.g. React Query). |
| `index.ts` | Barrel. |

Repository interfaces (e.g. in infra) use these for list methods (OffsetListParams, CursorListParams, UserSortBy, etc.). Error middleware uses ErrorCode and status mapping to respond consistently.
