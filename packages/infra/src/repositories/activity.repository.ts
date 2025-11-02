import { prisma } from "../database/prisma.client";
import { Activity, TCreateActivityDto, TUpdateActivityDto } from "@repo/shared";
import { IActivityRepository, NewEntity } from "../interfaces";

export class ActivityRepository implements IActivityRepository {
  async create(dto: TCreateActivityDto): Promise<Activity> {
    const data: NewEntity<Activity> = {
      taskId: dto.taskId,
      actorId: dto.actorId,
      type: dto.type,
      message: dto.message?.trim(),
    };
    // DB sets createdAt via @default(now()); do not pass createdAt here
    return prisma.activity.create({ data }); // returns Activity with id/createdAt
  }

  async save(activity: Activity): Promise<void> {
    // If immutable, you could throw here. If mutable, restrict to message:
    await prisma.activity.update({
      where: { id: activity.id },
      data: { message: activity.message },
    }); // Avoid changing actorId/taskId/type/createdAt.
  }

  async delete(id: string): Promise<void> {
    // Optionally check existence first to avoid throwing on missing ids
    await prisma.activity.delete({ where: { id } }).catch((e) => {
      // Swallow not found to keep "idempotent" contract, or rethrow based on your policy
      if (e.code !== "P2025") throw e;
    });
  }

  async findById(id: string): Promise<Activity | null> {
    return prisma.activity.findUnique({ where: { id, deletedAt: null } });
  }

  async findActivityByTaskId(id: string): Promise<Activity[]> {
    return prisma.activity.findMany({
      where: { taskId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async softDelete(activityId: string, when: Date): Promise<boolean> {
    // Only if your Activity model has deletedAt; otherwise remove this method
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
    // Only meaningful if you have deletedAt
    const row = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { deletedAt: true },
    });
    return !!(row as any)?.deletedAt;
  }

  async update(
    activityId: string,
    dto: TUpdateActivityDto,
  ): Promise<{ changed: Record<string, unknown> }> {
    const patch = {} as NewEntity<Activity>;
    if (dto.message !== undefined) patch.message = dto.message?.trim();

    if (Object.keys(patch).length === 0) return { changed: {} };

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: patch,
      select: {
        id: true,
        message: true,
        createdAt: true, // immutable reference timestamp
      },
    });

    const changed: Record<string, unknown> = {};
    for (const k of Object.keys(patch)) {
      if (k in updated) changed[k] = (updated as any)[k];
    }
    // No updatedAt if activities are immutable; omit unless your model has it
    return { changed };
  }
}
