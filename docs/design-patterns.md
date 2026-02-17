# Design patterns and practices

This document maps the main **design patterns** and **SOLID / Clean Code** practices used in TaskFlow. See [Architecture](architecture.md) and [Data flow](data-flow.md) for how they fit in the request flow.

## Repository pattern

Persistence is hidden behind **interfaces** (ports) in `@repo/infra`. Use cases depend only on these interfaces (e.g. `IUserRepository`); they never touch Prisma or SQL.

- **Port:** `IRepository<T, ID>` and aggregate-specific interfaces (`IUserRepository`, `ITaskRepository`, etc.) in `packages/infra/src/interfaces/`.
- **Adapter:** Concrete classes in `packages/infra/src/repositories/` that implement the interfaces using the Prisma client.

Benefits: core stays testable with in-memory or mock repositories; swapping the database or ORM only requires new implementations of the same interfaces.

## Use case (application service) pattern

Each **action** is a single class that orchestrates repositories and (optionally) the event publisher. One use case = one verb + entity (e.g. `CreateUserUseCase`, `GetTaskByIdUseCase`).

- **Location:** `packages/core/src/use-cases/` per aggregate (user, task, project, activity).
- **Responsibilities:** Validate business rules, call repository methods, publish domain events. No HTTP, no Prisma.
- **Input:** DTOs or ids from shared; output: entity or list result.

New features are added by adding new use cases and new routes/controllers; existing use cases and repositories stay unchanged (Open/Closed).

## Dependency injection

Use cases and (in this setup) controllers receive their **dependencies via the constructor**:

- Controllers instantiate repositories and event publisher, then pass them into use case constructors (e.g. `new CreateUserUseCase(this.userRepo, eventBusPublisher)`).
- Use cases declare interfaces (e.g. `IUserRepository`, `IEventPublisher`) and receive concrete implementations from the API app.

No framework container is required; wiring is explicit in the API layer. This keeps core free of infrastructure and makes unit tests easy (inject mocks).

## Adapters (hexagonal style)

HTTP and persistence are **adapters** that implement ports:

- **HTTP adapter:** Express routes and controllers translate HTTP requests into use case calls and use case results into HTTP responses. The port is “application accepts DTOs and returns entities”; Express is the adapter.
- **Persistence adapter:** Repository implementations (Prisma) adapt the “repository port” to the database. The event bus publisher adapts the “event publisher port” to in-memory (or later RabbitMQ).

Domain and application (core) sit in the center; adapters depend inward on ports.

## SOLID

| Principle | How it shows up |
| ----------- | ------------------ |
| **SRP (Single Responsibility)** | Controllers only do HTTP in/out. Use cases only orchestrate one action. Repositories only do persistence for one aggregate. Validation is at the edge (middleware). |
| **OCP (Open/Closed)** | New behavior = new use cases and new routes; existing use cases and repository interfaces stay unchanged. New repositories (e.g. a new storage backend) implement existing interfaces. |
| **LSP (Liskov Substitution)** | Any implementation of `IUserRepository` can replace another (e.g. Prisma impl vs mock) without breaking use cases. |
| **ISP (Interface Segregation)** | Interfaces are per aggregate and per concern (e.g. `IUserRepository` with user-specific methods; `IEventPublisher` only for publishing). No fat interfaces. |
| **DIP (Dependency Inversion)** | Core depends on abstractions in infra (`IUserRepository`, `IEventPublisher`), not on Prisma or Express. Infra implements those abstractions. |

## Clean Code–oriented choices

- **Naming:** Use case classes are named by action + entity (e.g. `CreateUserUseCase`, `GetTasksCursorUseCase`). Routes and controllers mirror resources and HTTP verbs.
- **Thin controllers:** Controllers only extract input from `req`, call one use case, and send `res.status(...).json(...)`. No conditionals or business rules.
- **Validation at the edge:** All input validation (body, query, params) is done in one place (Zod middleware) so use cases receive already-validated data. No duplicate validation in core.
- **Single error type:** `DomainError` with `code`, `message`, `details`, and optional `status` is used from validation, use cases, and repository layer so the API can return a consistent error shape.
- **Explicit DTOs and types:** Shared package exports both Zod schemas and inferred TypeScript types (e.g. `TCreateUserDto`) so the API and core stay type-safe end to end.

These patterns keep the codebase consistent, testable, and easy to extend without modifying existing application or infrastructure code.
