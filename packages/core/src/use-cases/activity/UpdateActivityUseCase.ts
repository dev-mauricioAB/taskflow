// @repo/core/application/use-cases/UpdateActivityUseCase.ts
import { DomainError, IActivityRepository, IEventPublisher } from "@repo/infra";
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
    // 1) Existence check
    const exists = await this.activities.exists(id);
    if (!exists) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: `Activity '${id}' not found`,
      });
    }

    // 2) Normalize + validate
    const normalized: Record<string, unknown> = {};
    if (typeof dto.message !== "undefined") {
      const msg = dto.message?.trim();
      if (!msg) {
        throw new DomainError({
          code: "VALIDATION_FAILED",
          message: "Message cannot be empty",
        });
      }
      normalized.message = msg;
    }

    // 3) Determine intended keys (ignore undefined)
    const intended = (
      Object.keys(normalized) as (keyof typeof normalized)[]
    ).filter((k) => normalized[k] !== undefined);

    if (intended.length === 0) {
      return { changed: {} };
    }

    // 4) Persist minimal patch; repository returns a small projection
    const updated: TUpdateActivityDto | null = await this.activities.update(
      id,
      {
        ...normalized,
        // updatedAt: new Date(),
      },
    );
    if (!updated) {
      // Defensive for concurrent deletion
      throw new DomainError({
        code: "NOT_FOUND",
        message: `Activity '${id}' not found`,
      });
    }

    // 5) Compute changed from intended ∩ projection
    const changed: Record<string, unknown> = {};
    for (const key of intended) {
      if (key in updated) {
        changed[key as string] = (updated as any)[key as string];
      }
    }

    // 6) Publish event only if there are actual changes
    if (Object.keys(changed).length > 0) {
      const payload: ActivityUpdatedPayload = {
        activityId: id,
        changed,
        occurredAt: new Date().toISOString(),
      };
      this.events.publish<ActivityUpdatedPayload>(ACTIVITY_UPDATED, payload);
    }

    return { changed };
  }
}
