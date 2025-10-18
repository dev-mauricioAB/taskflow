import { Task } from "@core/entities/task.entity";
import { prisma } from "../database/prisma.client";

export class TaskRepository {
  async create(task: Task): Promise<Task> {
    return prisma.task.create({ data: task });
  }

  async findAll(): Promise<Task[]> {
    return prisma.task.findMany();
  }
}
