import { User } from "@core/entities/user.entity";
import { prisma } from "../database/prisma.client";

export class UserRepository {
  async create(user: User): Promise<User> {
    return prisma.user.create({ data: user });
  }

  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }
}
