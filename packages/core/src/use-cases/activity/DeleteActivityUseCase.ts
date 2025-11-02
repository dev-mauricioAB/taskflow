// @repo/core/application/use-cases/DeleteActivityUseCase.ts
import { DomainError, IActivityRepository, IEventPublisher } from "@repo/infra";
import { ACTIVITY_DELETED, ActivityDeletedPayload } from "@repo/shared";

type DeleteActivityInput = { activityId: string; hard?: boolean };

export class DeleteActivityUseCase {
  constructor(
    private readonly activities: IActivityRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute({
    activityId,
    hard = false,
  }: DeleteActivityInput): Promise<void> {
    const exists = await this.activities.exists(activityId); // idempotent behavior [web:239]
    if (!exists)
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Activity not found",
      });

    const nowIso = new Date().toISOString();

    if (hard && this.activities.hardDelete) {
      await this.activities.hardDelete(activityId); // idempotent via deleteMany [web:186][web:74]
    } else if (this.activities.softDelete) {
      await this.activities.softDelete(activityId, new Date()); // idempotent via updateMany [web:74][web:81]
    } else {
      await this.activities.delete(activityId); // fallback physical delete [web:81]
    }

    const payload: ActivityDeletedPayload = {
      activityId,
      occurredAt: nowIso,
      hard: !!hard,
    };
    this.events.publish<ActivityDeletedPayload>(ACTIVITY_DELETED, payload); // publish once the state change succeeds [web:68]
  }
}
