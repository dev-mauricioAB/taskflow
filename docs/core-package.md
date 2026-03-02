# Core package (`@repo/core`)

The core package holds **application logic only**: use cases (one class per action) and **subscribers** that react to domain events. It depends on **ports** (interfaces) from `@repo/infra` and on DTOs/entities/events from `@repo/shared`. It does **not** import Prisma, Express, or any HTTP or database implementation.

## Use cases

Use cases are grouped by aggregate under `packages/core/src/use-cases/`. Each use case receives repository and/or event-publisher interfaces via the constructor and executes a single action (e.g. create user, get task by id).

### User (`use-cases/user/`)

| Use case              | File                       | Role                               |
| --------------------- | -------------------------- | ---------------------------------- |
| CreateUserUseCase     | `CreateUserUseCase.ts`     | Create user; publish USER_CREATED  |
| UpdateUserUseCase     | `UpdateUserUseCase.ts`     | Update user; publish USER_UPDATED  |
| DeleteUserUseCase     | `DeleteUserUseCase.ts`     | Soft/hard delete; events as needed |
| ReactivateUserUseCase | `ReactivateUserUseCase.ts` | Reactivate soft-deleted user       |
| GetUserByIdUseCase    | `GetUserByIdUseCase.ts`    | Find user by id                    |
| GetUsersOffsetUseCase | `GetUsersOffsetUseCase.ts` | List users with offset pagination  |
| GetUsersCursorUseCase | `GetUsersCursorUseCase.ts` | List users with cursor pagination  |

Barrel: `use-cases/user/index.ts`.

### Task (`use-cases/task/`)

| Use case                   | File                            | Role             |
| -------------------------- | ------------------------------- | ---------------- |
| CreateTaskUseCase          | `CreateTaskUseCase.ts`          | Create task      |
| UpdateTaskUseCase          | `UpdateTaskUseCase.ts`          | Update task      |
| UpdateTaskStatusUseCase    | `UpdateTaskStatusUseCase.ts`    | Change status    |
| MarkTaskAsCompletedUseCase | `MarkTaskAsCompletedUseCase.ts` | Mark done        |
| CompleteTaskUseCase        | `CompleteTaskUseCase.ts`        | Complete task    |
| DeleteTaskUseCase          | `DeleteTaskUseCase.ts`          | Delete task      |
| GetTaskByIdUseCase         | `GetTaskByIdUseCase.ts`         | Get by id        |
| GetTasksOffsetUseCase      | `GetTasksOffsetUseCase.ts`      | List with offset |
| GetTasksCursorUseCase      | `GetTasksCursorUseCase.ts`      | List with cursor |

Barrel: `use-cases/task/index.ts`.

### Project (`use-cases/project/`)

| Use case                 | File                          | Role             |
| ------------------------ | ----------------------------- | ---------------- |
| CreateProjectUseCase     | `CreateProjectUseCase.ts`     | Create project   |
| UpdateProjectUseCase     | `UpdateProjectUseCase.ts`     | Update project   |
| DeleteProjectUseCase     | `DeleteProjectUseCase.ts`     | Delete project   |
| GetProjectByIdUseCase    | `GetProjectByIdUseCase.ts`    | Get by id        |
| GetProjectsOffsetUseCase | `GetProjectsOffsetUseCase.ts` | List with offset |
| GetProjectsCursorUseCase | `GetProjectsCursorUseCase.ts` | List with cursor |

Barrel: `use-cases/project/index.ts`.

### Activity (`use-cases/activity/`)

| Use case                     | File                              | Role            |
| ---------------------------- | --------------------------------- | --------------- |
| CreateActivityUseCase        | `CreateActivityUseCase.ts`        | Create activity |
| UpdateActivityUseCase        | `UpdateActivityUseCase.ts`        | Update activity |
| DeleteActivityUseCase        | `DeleteActivityUseCase.ts`        | Delete activity |
| GetActivitiesByTaskIdUseCase | `GetActivitiesByTaskIdUseCase.ts` | List by task id |
| FindActivitiesUseCase        | `FindActivitiesUseCase.ts`        | Find activities |

Barrel: `use-cases/activity/index.ts`.

Main barrel: `packages/core/src/use-cases/index.ts` re-exports user, project, task, activity.

## Subscribers

Subscribers register with the **event bus** from `@repo/infra` and run when events are published (e.g. after a use case creates or updates an entity). They live in `packages/core/src/subscribers/`.

| Subscriber       | File                 | Events                     |
| ---------------- | -------------------- | -------------------------- |
| User logging     | `userLogging.ts`     | USER_CREATED, USER_UPDATED |
| Task logging     | `taskLogging.ts`     | Task-related events        |
| Project logging  | `projectLogging.ts`  | Project-related events     |
| Activity logging | `activityLogging.ts` | Activity-related events    |

Registration happens in the API app (e.g. in `app.ts`): `registerUserLoggingSubscribers()`, `registerTaskLoggingSubscribers()`, etc. The event bus is in-memory and can be swapped for a transport like RabbitMQ later.

## Ports (dependencies on infra)

Core depends only on **interfaces** from `@repo/infra`:

- **IUserRepository**, **ITaskRepository**, **IProjectRepository**, **IActivityRepository** — persistence; extend the generic `IRepository<T, ID>` with aggregate-specific methods (e.g. `findByEmail`, `reactivate`, offset/cursor list).
- **IEventPublisher** — publish domain events (e.g. `publish(USER_CREATED, payload)`).

Use cases receive these in the constructor (dependency injection). The API app instantiates the concrete repositories and event publisher from infra and passes them into the use cases. Core never imports Prisma or HTTP.
