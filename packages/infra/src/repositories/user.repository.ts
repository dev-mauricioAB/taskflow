import { prisma } from "../database/prisma.client";
import { User } from "@repo/shared";
import { IUserRepository } from "../interfaces/IUserRepository";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async save(user: User): Promise<void> {
    if (user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // include only mutable fields from your schema
          name: user.name,
          email: user.email,
          // ...any other updatable fields
        },
      });
      return;
    }

    await prisma.user.create({ data: user });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async create(user: User): Promise<User> {
    return prisma.user.create({ data: user });
  }

  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }
}
