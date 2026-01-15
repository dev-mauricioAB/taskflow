# TaskFlow

TaskFlow is a **monorepo productivity platform** built with **Next.js**, **Node.js**, and **Turborepo** — designed to practice **Clean Architecture**, **SOLID principles**, and **scalable system design**.

The goal is to simulate a real-world SaaS ecosystem, including authentication, task management, team collaboration, analytics, and integrations.

---

## 🚀 Tech Stack

### Frontend

- **Next.js (App Router)** with TypeScript
- **React Query / TanStack Query** for server state
- **Zustand** for local state management
- **TailwindCSS + ShadCN/UI** for styling
- **SCI Charts** for analytics dashboards

### API

- **Node.js + Express / NestJS-style Clean Architecture**
- **Prisma ORM** with **MySQL**
- **Zod** for schema validation
- **JWT-based authentication**
- **Docker** for environment setup

### DevOps / Monorepo

- **Turborepo** for task and dependency orchestration
- **Docker Compose** for running api, frontend, and database
- **ESLint + Prettier** for linting and formatting
- **Husky + Lint-Staged** for git hooks

---

## 🧠 Architecture Overview

This project follows **Clean Architecture** principles:

```bash
/apps
  /web              → Next.js frontend
  /api              → Node.js API
/packages
  /core             → Domain entities, use-cases, interfaces
  /ui               → Shared UI components
  /utils            → Shared helpers & types
```

### Layers

| Layer              | Description                           |
| ------------------ | ------------------------------------- |
| **Entities**       | Core business logic and domain models |
| **Use Cases**      | Application-specific business rules   |
| **Infrastructure** | Database, API, external services      |
| **Presentation**   | UI components and pages               |

---

## 🧩 Features

✅ Authentication (Sign up / Login / Forgot Password)  
✅ Team & User management  
✅ Task CRUD with tagging and filtering  
✅ Real-time notifications (WebSockets)  
✅ Analytics dashboards (task progress, velocity)  
✅ Commenting and collaboration per task  
✅ Audit logs and activity timeline  
✅ Dockerized full environment (API + Web + MySQL)  
✅ Unit and integration tests

---

## 🐳 Running Locally with Docker

### 1️⃣ Clone the repo

```bash
git clone https://github.com/dev-mauricioAB/taskflow.git
cd taskflow
```

### 2️⃣ Build and start containers

```bash
docker-compose up --build
```

### 3️⃣ Run migrations

```bash
docker exec -it taskflow-api npx prisma migrate deploy
```

### 4️⃣ Access the app

- Frontend → [http://localhost:3000](http://localhost:3000)
- API → [http://localhost:4000](http://localhost:4000)
- MySQL → `localhost:3306`

---

## 🧪 Testing

### Run all tests

```bash
turbo run test
```

### Run lint check

```bash
turbo run lint
```

---

## 🧱 Project Backlog (High-Level)

1. **Monorepo Setup**
   - Initialize Turborepo
   - Setup base apps (`web`, `api`) and shared packages
2. **Backend Architecture**
   - Configure Express + Clean Architecture structure
   - Setup Prisma, migrations, and database models
   - Implement Auth (JWT + refresh)
3. **Frontend Setup**
   - Initialize Next.js app
   - Configure Tailwind, ShadCN, and Zustand
   - Add auth pages and protected routes
4. **Core Features**
   - Task CRUD
   - Teams and collaboration
   - Real-time notifications (Socket.IO)
   - Analytics dashboard
5. **DevOps / Tooling**
   - Docker Compose setup
   - ESLint, Prettier, Husky
   - CI/CD (optional)

---

## 📘 License

This project is under the **MIT License**.  
Feel free to fork, modify, and learn!

---

**Author:** [Maurício Alexandre Barroso](https://github.com/dev-mauricioAB)  
💡 Practicing advanced frontend and backend architecture in a real-world context.
