// @repo/core/application/use-cases/UpdateActivityUseCase.ts
import { IActivityRepository, IEventPublisher } from "@repo/infra";
import {
  ACTIVITY_UPDATED,
  ActivityUpdatedPayload,
  TUpdateActivityDto,
} from "@repo/shared";

export class UpdateActivityUseCase {
  constructor(
    private readonly activities: IActivityRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(
    id: string,
    dto: TUpdateActivityDto,
  ): Promise<{ changed: Record<string, unknown> }> {
    const exists = await this.activities.exists(id); // fast check [web:81]
    if (!exists) return { changed: {} };

    const patch: Partial<{ message: string }> = {};
    if (dto.message !== undefined) patch.message = dto.message?.trim();

    if (Object.keys(patch).length === 0) return { changed: {} };

    const result = await this.activities.update(id, patch); // returns { changed } [web:81]
    if (Object.keys(result.changed).length > 0) {
      const payload: ActivityUpdatedPayload = {
        activityId: id,
        changed: result.changed,
        occurredAt: new Date().toISOString(),
      };
      this.events.publish<ActivityUpdatedPayload>(ACTIVITY_UPDATED, payload); // publish after successful write [web:68]
    }
    return result;
  }
}
