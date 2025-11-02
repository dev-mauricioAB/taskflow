import { Activity } from "@repo/shared";
import { IRepository } from "./IRepository";

export interface IActivityRepository extends IRepository<Activity, string> {
  findActivityByTaskId(taskId: string): Promise<Activity[]>;
}
