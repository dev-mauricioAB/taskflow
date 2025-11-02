// @repo/core/application/use-cases/CreateActivityUseCase.ts
import {
  DomainError,
  IActivityRepository,
  IEventPublisher,
  NewEntity,
} from "@repo/infra";
import {
  Activity,
  ACTIVITY_CREATED,
  ActivityCreatedPayload,
  ActivityType,
} from "@repo/shared";

export class CreateActivityUseCase {
  private static allowed: ActivityType[] = [
    "created",
    "updated",
    "status_changed",
    "comment",
  ];

  constructor(
    private readonly activities: IActivityRepository,
    private readonly events?: IEventPublisher, // make required if you always publish
  ) {}

  async execute(data: NewEntity<Activity>): Promise<Activity> {
    if (!CreateActivityUseCase.allowed.includes(data.type)) {
      throw new DomainError({
        code: "VALIDATION_FAILED",
        message: "Invalid activity type",
      });
    }

    const activity = await this.activities.create(data);

    if (this.events) {
      const payload: ActivityCreatedPayload = {
        activityId: activity.id,
        taskId: activity.taskId,
        actorId: activity.actorId,
        type: activity.type,
        createdAt: activity.createdAt.toISOString(),
      };
      this.events.publish<ActivityCreatedPayload>(ACTIVITY_CREATED, payload);
    }

    return activity;
  }
}
