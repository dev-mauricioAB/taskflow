import { DomainError, IEventPublisher, IProjectRepository } from "@repo/infra";
import {
  Project,
  PROJECT_UPDATED,
  ProjectUpdatedPayload,
  TUpdateProjectDto,
} from "@repo/shared";

type Input = {
  projectId: string;
  patch: Partial<Project>;
};

export class UpdateProjectUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute({
    projectId,
    patch,
  }: Input): Promise<{ changed: Record<string, unknown> }> {
    // 1) Load current to validate existence and support transition/derivations
    const current = await this.projects.findById(projectId);
    if (!current) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    // 2) Normalize incoming fields (ignore undefined)
    const normalized: Record<string, unknown> = {};
    if (patch.name !== undefined) normalized.name = patch.name?.trim();
    if (patch.description !== undefined)
      normalized.description = patch.description?.trim();
    if (patch.ownerId !== undefined) normalized.ownerId = patch.ownerId;

    // if (patch.status !== undefined) normalized.status = patch.status;

    // 3) Determine intended keys
    const intended = (
      Object.keys(normalized) as (keyof typeof normalized)[]
    ).filter((k) => normalized[k] !== undefined);

    if (intended.length === 0) {
      return { changed: {} };
    }

    // 4) Persist minimal patch; repository returns a small projection
    const updated: TUpdateProjectDto | null = await this.projects.update(
      projectId,
      {
        ...normalized,
        // updatedAt: new Date(),
      },
    );

    if (!updated) {
      // Defensive: concurrent deletion after read
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    // 5) Build changed map from intended keys ∩ returned projection
    const changed: Record<string, unknown> = {};
    for (const key of intended) {
      if (key in updated) {
        changed[key as string] = (updated as any)[key as string];
      }
    }

    // 6) Publish integration event with the computed changed set
    const payload: ProjectUpdatedPayload = {
      projectId,
      changed,
      updatedAt: new Date().toISOString(),
      // updatedAt: updated.updatedAt.toISOString(),
    };
    this.events.publish<ProjectUpdatedPayload>(PROJECT_UPDATED, payload);

    return { changed };
  }
}
