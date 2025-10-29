import { User } from "@repo/shared";

export class CreateUserUseCase {
  execute(data: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    if (!data.name?.trim()) throw new Error("Name is required");
    if (!data.email?.includes("@")) throw new Error("Invalid email");
    return {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      createdAt: new Date(),
    };
  }
}