# TaskFlow Documentation

TaskFlow is a full-stack monorepo productivity platform built with Next.js and Express. The codebase follows **Clean Architecture**, with clear separation between use cases, repositories, interfaces, DTOs, validation, and infrastructure (ORM, auth, event bus). This documentation describes the structure and how the pieces fit together.

## How to use these docs

1. Start with [Architecture](architecture.md) for the big picture and layers.
2. Read [Data flow](data-flow.md) to see a concrete request path (e.g. create user).
3. Use [Monorepo](monorepo.md) to find where everything lives (packages, paths, scripts).
4. Dive into package docs for details: [Core](core-package.md), [Infra](infra-package.md), [Shared](shared-package.md).
5. See [Backend stack](backend-stack.md) for routes, controllers, and middlewares.
6. Check [Design patterns](design-patterns.md) for SOLID and Clean Code mapping.
7. See [SOLID and Clean Architecture](solid-and-clean-architecture.md) for principle-by-principle examples from the codebase.

## Documentation index

| Document | Description |
| ---------- | ------------- |
| [Architecture](architecture.md) | High-level architecture, layers, dependency rule, request path |
| [Data flow](data-flow.md) | End-to-end flow: HTTP → validation → use case → DB and events |
| [Monorepo](monorepo.md) | Workspaces, packages, build order, key paths, scripts |
| [Backend stack](backend-stack.md) | API app: routes, controllers, middlewares, config |
| [Core package](core-package.md) | Use cases, subscribers, and how they use ports |
| [Infra package](infra-package.md) | Repositories, interfaces, Prisma, event bus, errors |
| [Shared package](shared-package.md) | DTOs, Zod schemas, entities, events, shared types |
| [Design patterns](design-patterns.md) | Repository, use case, DI, adapters, SOLID, Clean Code |
| [SOLID and Clean Architecture](solid-and-clean-architecture.md) | How SOLID and Clean Architecture are applied, with workspace code examples |
