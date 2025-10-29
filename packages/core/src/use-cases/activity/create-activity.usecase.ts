import { Activity, ActivityType } from "@repo/shared";

export class CreateActivityUseCase {
  execute(data: Omit<Activity, "id" | "createdAt">): Activity {
    const allowed: ActivityType[] = ["created", "updated", "status_changed", "comment"];
    if (!allowed.includes(data.type)) throw new Error("Invalid activity type");
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    };
  }
}