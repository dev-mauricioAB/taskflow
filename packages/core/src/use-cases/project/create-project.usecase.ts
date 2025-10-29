import { Project } from "@repo/shared";

export class CreateProjectUseCase {
  execute(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
    if (!data.name?.trim()) throw new Error("Project name is required");
    return {
      id: crypto.randomUUID(),
      ...data,
      name: data.name.trim(),
      createdAt: new Date(),
    };
  }
}