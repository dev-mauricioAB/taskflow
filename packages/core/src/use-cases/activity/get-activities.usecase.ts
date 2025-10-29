import { Activity } from "@repo/shared";

export class GetActivitiesUseCase {
  execute(activities: Activity[]): Activity[] {
    return activities;
  }
}