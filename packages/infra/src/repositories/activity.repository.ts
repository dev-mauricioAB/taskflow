import { prisma } from "../database/prisma.client";
import { Activity } from "@repo/shared";

export class ActivityRepository {
  async create(activity: Activity): Promise<Activity> {
    return prisma.activity.create({ data: activity });
  }
  async findByTask(taskId: string): Promise<Activity[]> {
    return prisma.activity.findMany({ where: { taskId }, orderBy: { createdAt: "asc" } });
  }
}