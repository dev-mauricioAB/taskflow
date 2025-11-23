import { prisma } from "../database/prisma.client";
import {
  CursorListParams,
  CursorPage,
  CursorSortBy,
  OffsetListParams,
  OffsetPage,
  Task,
  TaskSortBy,
  TCreateTaskDto,
  TUpdateTaskDto,
} from "@repo/shared";
import { ITaskRepository } from "../interfaces/ITaskRepository";
import { NewEntity } from "../interfaces";
import { DomainError } from "../errors";
import { HandleAllPrismaErrors } from "../database/decorators/handle-prisma-errors";
import { buildTaskWhere, TaskFilters } from "./helpers";

@HandleAllPrismaErrors
export class TaskRepository implements ITaskRepository {
  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  }

  async save(task: Task): Promise<void> {
    if (task.id) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          title: task.title,
          description: task.description,
          status: task.status,
          projectId: task.projectId,
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

  async create(dto: TCreateTaskDto): Promise<Task> {
    const user = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Owner user not found",
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    const data: NewEntity<Task> = {
      title: dto.title.trim(),
      description: dto.description?.trim(),
      status: dto.status,
      userId: dto.userId,
      projectId: dto.projectId,
    };

    return prisma.task.create({ data });
  }

  async findAll(
    params: OffsetListParams<TaskSortBy> & TaskFilters,
  ): Promise<OffsetPage<Task, TaskSortBy>> {
    const {
      q,
      projectId,
      userId,
      status,
      includeDeleted = false,
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortDir = "desc",
    } = params;

    const where = buildTaskWhere({
      q,
      projectId,
      userId,
      status,
      includeDeleted,
    });

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: offset,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total, limit, offset, sortBy, sortDir };
  }

  async findAllCursor(
    params: CursorListParams<CursorSortBy> & TaskFilters,
  ): Promise<CursorPage<Task, CursorSortBy>> {
    const {
      q,
      projectId,
      userId,
      status,
      includeDeleted = false,
      take = 20,
      cursor,
      sortBy = "id",
      sortDir = "asc",
    } = params;

    const where = buildTaskWhere({
      q,
      projectId,
      userId,
      status,
      includeDeleted,
    });

    const orderBy =
      sortBy === "id"
        ? [{ id: sortDir }]
        : [{ [sortBy]: sortDir } as any, { id: sortDir }];

    const forward = take >= 0;
    const pageSize = Math.min(Math.abs(take || 20), 100);

    const args = {
      where,
      orderBy,
      take: (forward ? 1 : -1) * (pageSize + 1), // fetch one extra for hasMore
      skip: cursor ? 1 : undefined,
      cursor: cursor ? { id: cursor.id } : undefined,
    };

    const rows = await prisma.task.findMany(args);
    const normalized = forward ? rows : [...rows].reverse();

    // Replace the tail of findAllCursor with this cursor computation
    const hasMore = normalized.length > pageSize;
    const data = hasMore ? normalized.slice(0, pageSize) : normalized;

    // Direction-aware cursors: emit only the cursor that points in the user’s navigation direction
    let nextCursor: { id: string } | undefined;
    let prevCursor: { id: string } | undefined;

    if (forward) {
      // forward page: only next cursor if there are more after
      nextCursor = hasMore
        ? { id: String(data[data.length - 1]?.id) }
        : undefined;
      prevCursor = undefined;
    } else {
      // backward page: only prev cursor if there are more before
      prevCursor =
        hasMore && data.length ? { id: String(data[0]?.id) } : undefined;
      nextCursor = undefined;
    }

    return { data, nextCursor, prevCursor, sortBy, sortDir };
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

  async update(taskId: string, dto: TUpdateTaskDto): Promise<TUpdateTaskDto> {
    const ui = await prisma.user.findUnique({ where: { id: dto.userId } });
    if (!ui) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    const pj = await prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!pj) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: dto,
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

    return updated;
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
