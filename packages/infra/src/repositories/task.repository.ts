import { prisma } from "../database/prisma.client";
import { Task, TCreateTaskDto, TUpdateTaskDto } from "@repo/shared";
import { ITaskRepository } from "../interfaces/ITaskRepository";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NewEntity } from "../interfaces";

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
    try {
      await prisma.task.delete({ where: { id } });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        // P2025: Record to delete does not exist (Prisma known request error)
        // Swallow for idempotent delete or rethrow as NotFound depending on API choice.
        const code = err?.code;
        if (code === "P2025") {
          return;
        }
      }
      throw err;
    }
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    return prisma.task.findMany({ where: { projectId } });
  }

  // Create from DTO
  async create(dto: TCreateTaskDto): Promise<Task> {
    // Normalize if needed; DTO already validated by Zod upstream
    const data: NewEntity<Task> = {
      title: dto.title.trim(),
      description: dto.description?.trim(),
      status: dto.status,
      userId: dto.userId,
      projectId: dto.projectId,
    };

    // DB sets createdAt/updatedAt; return persisted entity
    return prisma.task.create({ data: data as any });
  }

  async findAll(): Promise<Task[]> {
    return prisma.task.findMany();
  }

  async markAsCompleted(taskId: string, completedAt: Date): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "done",
        updatedAt: completedAt,
      },
    });
  }

  async update(
    taskId: string,
    dto: TUpdateTaskDto,
  ): Promise<{ changed: Record<string, unknown> }> {
    const patch = {} as NewEntity<Task>;
    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.description !== undefined)
      patch.description = dto.description?.trim();
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.userId !== undefined) patch.userId = dto.userId;
    if (dto.projectId !== undefined) patch.projectId = dto.projectId;

    if (Object.keys(patch).length === 0) return { changed: {} };

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: patch,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        userId: true,
        projectId: true,
        updatedAt: true,
      },
    });

    const changed: Record<string, unknown> = {};
    for (const k of Object.keys(patch)) {
      if (k in updated) changed[k] = (updated as any)[k];
    }
    changed["updatedAt"] = updated.updatedAt;
    return { changed };
  }

  async softDelete(taskId: string, when: Date): Promise<boolean> {
    const res = await prisma.task.updateMany({
      where: { id: taskId, deletedAt: null },
      data: { deletedAt: when },
    });
    return res.count > 0;
  }

  async hardDelete(taskId: string): Promise<boolean> {
    const res = await prisma.task.deleteMany({ where: { id: taskId } });
    return res.count > 0;
  }

  async exists(taskId: string): Promise<boolean> {
    const row = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    return !!row;
  }

  async isSoftDeleted(taskId: string): Promise<boolean> {
    const row = await prisma.task.findUnique({
      where: { id: taskId },
      select: { deletedAt: true },
    });
    return !!row?.deletedAt;
  }
}
