import { prisma } from "../database/prisma.client";
import { Activity, TCreateActivityDto, TUpdateActivityDto } from "@repo/shared";
import {
  IActivityRepository,
  NewEntity,
  ActivityFindManyFilter,
} from "../interfaces";
import { DomainError } from "../errors";
import { HandleAllPrismaErrors } from "../database/decorators/handle-prisma-errors";

@HandleAllPrismaErrors
export class ActivityRepository implements IActivityRepository {
  async create(dto: TCreateActivityDto): Promise<Activity> {
    const user = await prisma.user.findUnique({ where: { id: dto.actorId } });
    if (!user) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    const task = await prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Task not found",
      });
    }

    const data: NewEntity<Activity> = {
      taskId: dto.taskId,
      actorId: dto.actorId,
      type: dto.type,
      message: dto.message?.trim(),
    };
    return prisma.activity.create({ data });
  }

  async save(activity: Activity): Promise<void> {
    await prisma.activity.update({
      where: { id: activity.id },
      data: { message: activity.message },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.activity.delete({ where: { id } });
  }

  async findById(id: string): Promise<Activity | null> {
    return prisma.activity.findFirst({ where: { id, deletedAt: null } });
  }

  async findActivityByTaskId(id: string): Promise<Activity[]> {
    return prisma.activity.findMany({
      where: { taskId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async findMany(filter: ActivityFindManyFilter): Promise<Activity[]> {
    const where: any = { deletedAt: null };

    // Apply optional filters; Prisma ignores undefined fields
    if (filter.taskId !== undefined) where.taskId = filter.taskId;
    if (filter.actorId !== undefined) where.actorId = filter.actorId;
    if (filter.type !== undefined) where.type = filter.type;

    return prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" }, // newest first for general queries
    });
  }

  async softDelete(activityId: string, when: Date): Promise<boolean> {
    const res = await prisma.activity.updateMany({
      where: { id: activityId, deletedAt: null },
      data: { deletedAt: when },
    });
    return res.count > 0;
  }

  async hardDelete(activityId: string): Promise<boolean> {
    const res = await prisma.activity.deleteMany({ where: { id: activityId } });
    return res.count > 0;
  }

  async exists(activityId: string): Promise<boolean> {
    const row = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    return !!row;
  }

  async isSoftDeleted(activityId: string): Promise<boolean> {
    const row = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { deletedAt: true },
    });
    return !!row?.deletedAt;
  }

  async update(
    activityId: string,
    dto: TUpdateActivityDto,
  ): Promise<TUpdateActivityDto> {
    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: dto,
      select: {
        id: true,
        message: true,
        createdAt: true,
      },
    });

    return updated;
  }
}
