# SOLID and Clean Architecture in TaskFlow

This document shows **where and how** SOLID principles and **Clean Architecture** are applied in the TaskFlow workspace, with concrete code examples from the repo.

---

## Clean Architecture

### Dependency rule: core depends only on abstractions

The **application layer** (`@repo/core`) must not depend on frameworks or infrastructure. It depends only on **interfaces (ports)** and shared types.

**Evidence:** The core package never imports Prisma or Express. A search over `packages/core/src` for `@prisma` or `express` returns no matches. Core’s dependencies are `@repo/shared` and `@repo/infra` — and from infra it uses only **interfaces**, not concrete repositories or the Prisma client.

```json
// packages/core/package.json — no Prisma, no Express
"devDependencies": {
  "@repo/shared": "*",
  "@repo/infra": "*",
  ...
}
```

Use cases receive **abstractions** in the constructor and call methods on those abstractions:

```typescript
// packages/core/src/use-cases/user/CreateUserUseCase.ts
import {
  IEventPublisher,
  IUserRepository,
  NewEntity,
  DomainError,
} from "@repo/infra";
import { USER_CREATED, UserCreatedPayload, User } from "@repo/shared";
import { TCreateUserDto } from "@repo/shared";

export class CreateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(input: TCreateUserDto): Promise<User> {
    // ... business logic only; calls this.users.create(), this.events.publish()
    const user = await this.users.create(newUser);
    this.events.publish<UserCreatedPayload>(USER_CREATED, payload);
    return user;
  }
}
```

So: **application (core) depends on ports (interfaces)**, not on HTTP or the database. That is the core of Clean Architecture’s dependency rule.

### Layers and where they live

| Layer                       | Location                                           | Role                                                            |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| **Entities / shared types** | `packages/shared` (entities, types, DTOs, events)  | Domain shapes and API contracts; no framework.                  |
| **Use cases (application)** | `packages/core` (use-cases, subscribers)           | Orchestrate repositories and events; depend only on interfaces. |
| **Interface adapters**      | `apps/api` (controllers, routes, middlewares)      | Translate HTTP ↔ use cases.                                    |
| **Infrastructure**          | `packages/infra` (repositories, Prisma, event bus) | Implement persistence and event publishing.                     |

**Entities** are plain types used across layers. Example:

```typescript
// packages/shared/src/entities/user.entity.ts
export interface User {
  id: string;
  keycloakUserId?: string | null;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
```

**Infrastructure** implements the ports. The same `CreateUserUseCase` can work with a real repository or a test double, because it only knows `IUserRepository` and `IEventPublisher`.

---

## SOLID in the workspace

### Single Responsibility Principle (SRP)

Each class has one reason to change.

**Controller:** Only HTTP in/out. No business rules, no persistence.

```typescript
// apps/api/src/controllers/user.controller.ts (excerpt)
async create(
  req: Request<{}, {}, TCreateUserDto>,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await this.createUserUC.execute(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
}
```

**Use case:** Only application rules for one action (create user: check email, create, publish event).

**Repository:** Only persistence for one aggregate (e.g. user). Example:

```typescript
// packages/infra/src/repositories/user.repository.ts (excerpt)
@HandleAllPrismaErrors
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }
  async create(...) { ... }
  // ... only persistence operations
}
```

**Validation** is a separate concern: one middleware handles all Zod validation at the edge, so use cases receive already-validated data.

```typescript
// apps/api/src/infra/http/middlewares/validate-request.middleware.ts (excerpt)
export function validate(schemas: Schemas) {
  const wrapper = z.object({
    body: schemas.body ?? z.any(),
    query: schemas.query ?? z.any(),
    params: schemas.params ?? z.any(),
  });
  return async (req, _res, next) => {
    const parsed = await wrapper.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // assign parsed back to req; on ZodError → DomainError(VALIDATION_FAILED)
  };
}
```

So: one place for validation, one for HTTP, one for “create user” rules, one for user persistence.

---

### Open/Closed Principle (OCP)

Open for extension, closed for modification: add new behavior by adding new code, not by changing existing code.

**New use case:** Add a new file (e.g. `GetUserByIdUseCase.ts`) and export it. No change to existing use cases or to `IUserRepository`.

**New repository implementation:** Implement the same interface (e.g. in-memory or another DB). Use cases stay unchanged:

```typescript
// packages/infra/src/interfaces/IUserRepository.ts
export interface IUserRepository extends IRepository<User, string> {
  findAll(
    params: OffsetListParams<UserSortBy>,
  ): Promise<OffsetPage<User, UserSortBy>>;
  findAllCursor(
    params: CursorListParams<CursorSortBy>,
  ): Promise<CursorPage<User, CursorSortBy>>;
  reactivate(userId: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}
```

**New route:** Add a new route file and mount it in `api.routes.ts`; controllers and use cases can stay as they are. The design is extended, not modified.

---

### Liskov Substitution Principle (LSP)

Any implementation of an interface can replace another without breaking callers. Use cases depend on `IUserRepository` and `IEventPublisher`; in production they get `UserRepository` and the real event publisher; in tests they get mocks. The use case code is the same.

**Production wiring (controller):**

```typescript
// apps/api/src/controllers/user.controller.ts (excerpt)
export class UserController {
  private userRepo = new UserRepository();
  private createUserUC = new CreateUserUseCase(
    this.userRepo,
    eventBusPublisher,
  );
  // ...
}
```

**Test wiring (mock implementing the same interface):**

```typescript
// packages/core/src/use-cases/__tests__/user/CreateUserUseCase.test.ts (excerpt)
function makeRepo(): Mocked<IUserRepository> {
  return {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn() as any,
    update: vi.fn() as any,
    delete: vi.fn() as any,
  } as unknown as Mocked<IUserRepository>;
}
function makeEvents(): Mocked<IEventPublisher> {
  return { publish: vi.fn() } as unknown as Mocked<IEventPublisher>;
}
// ...
repo = makeRepo();
events = makeEvents();
uc = new CreateUserUseCase(repo, events);
```

`CreateUserUseCase` does not know whether it’s talking to the real repository or a mock; it only uses the contract. That’s LSP in practice.

---

### Interface Segregation Principle (ISP)

Clients should not depend on interfaces they do not use. We have small, focused interfaces.

**Persistence:** One interface per aggregate (e.g. `IUserRepository`), extending a generic base only with methods that aggregate needs:

```typescript
// packages/infra/src/interfaces/IUserRepository.ts
export interface IUserRepository extends IRepository<User, string> {
  findAll(
    params: OffsetListParams<UserSortBy>,
  ): Promise<OffsetPage<User, UserSortBy>>;
  findAllCursor(
    params: CursorListParams<CursorSortBy>,
  ): Promise<CursorPage<User, CursorSortBy>>;
  reactivate(userId: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}
```

**Events:** A separate, minimal interface so use cases that only need to publish don’t depend on repository methods:

```typescript
// packages/infra/src/interfaces/IEventPublisher.ts
export interface IEventPublisher {
  publish<T>(eventName: string, payload: T): void;
}
```

So: use cases that only need “create user and publish” depend on `IUserRepository` + `IEventPublisher`, not on a single fat interface. Each interface is tailored to what its callers need.

---

### Dependency Inversion Principle (DIP)

High-level modules (use cases) must not depend on low-level modules (Prisma, HTTP). Both should depend on abstractions.

**High-level:** `CreateUserUseCase` depends on `IUserRepository` and `IEventPublisher` (abstractions from `@repo/infra`).

**Low-level:** `UserRepository` (infra) implements `IUserRepository` and uses Prisma; `EventBusPublisher` implements `IEventPublisher` and uses the event bus. The **composition root** (the API app) wires the concrete implementations into the use cases:

```typescript
// apps/api/src/controllers/user.controller.ts (excerpt)
import { DomainError, eventBusPublisher, UserRepository } from "@repo/infra";
// ...
private userRepo = new UserRepository();
private createUserUC = new CreateUserUseCase(this.userRepo, eventBusPublisher);
```

So the dependency direction is: **Core → interfaces (in infra) ← implementations (in infra)**. Core never imports `UserRepository` or Prisma; it only imports the interfaces and shared types. That is DIP: application depends on abstractions, infrastructure implements them and is injected at the edge.

---

## Summary table

| Principle                                | Where it shows in TaskFlow                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Clean Architecture – dependency rule** | Core has no Prisma/Express; use cases depend on `IUserRepository`, `IEventPublisher` from infra.                        |
| **SRP**                                  | Controller = HTTP only; use case = one action; repository = persistence for one aggregate; validation = one middleware. |
| **OCP**                                  | New use cases and new repository implementations without changing existing use cases or interfaces.                     |
| **LSP**                                  | Real `UserRepository` and mock `Mocked<IUserRepository>` are interchangeable in `CreateUserUseCase`.                    |
| **ISP**                                  | Small interfaces: `IUserRepository`, `IEventPublisher`, generic `IRepository<T, ID>`.                                   |
| **DIP**                                  | Use cases depend on interfaces; API app injects concrete repository and event publisher.                                |

Together, these choices keep the codebase testable (mocks), flexible (new implementations and new use cases without touching existing code), and aligned with Clean Architecture’s dependency rule and layering.
