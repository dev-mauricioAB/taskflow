import { prisma } from "../database/prisma.client";
import { Task } from "@repo/shared";

export class TaskRepository {
  async create(task: Task): Promise<Task> {
    return prisma.task.create({ data: task });
  }
  async findAll(): Promise<Task[]> {
    return prisma.task.findMany();
  }
  async findByProject(projectId: string): Promise<Task[]> {
    return prisma.task.findMany({ where: { projectId } });
  }
}