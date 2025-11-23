import { Activity, ActivityType } from "@repo/shared";
import { IRepository } from "./IRepository";

export type ActivityFindManyFilter = {
  taskId?: string;
  actorId?: string;
  type?: ActivityType;
};

export interface IActivityRepository extends IRepository<Activity, string> {
  findActivityByTaskId(taskId: string): Promise<Activity[]>;
  findMany(filter: ActivityFindManyFilter): Promise<Activity[]>;
}
