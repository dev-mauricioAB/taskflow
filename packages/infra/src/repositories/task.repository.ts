import { prisma } from "../database/prisma.client";
import { Task } from "@repo/shared";
import { ITaskRepository } from "../interfaces/ITaskRepository";

export class TaskRepository implements ITaskRepository {
  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  }

  async save(task: Task): Promise<void> {
    // If your Task has an id generated on create, treat presence of id as update; otherwise adjust accordingly. [web:19]
    if (task.id) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          // spread only updatable fields; avoid overwriting id if your Task type includes it
          // adjust keys to your schema
          title: task.title,
          description: task.description,
          status: task.status,
          projectId: task.projectId,
          // add other fields as needed
        },
      });
      return;
    }

    await prisma.task.create({ data: task });
  }

  async delete(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    return prisma.task.findMany({ where: { projectId } });
  }

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
