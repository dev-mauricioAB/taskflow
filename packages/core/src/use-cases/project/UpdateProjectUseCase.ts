import {
  DomainError,
  IEventPublisher,
  IProjectRepository,
  NotFoundError,
} from "@repo/infra";
import { Project, PROJECT_UPDATED, ProjectUpdatedPayload } from "@repo/shared";

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
    // Fetch existing to validate and compute safe updates
    const current = await this.projects.findById(projectId);
    if (!current)
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Project not found",
      });

    const next: Project = {
      ...current,
      ...patch,
      updatedAt: new Date(),
    };

    const result = await this.projects.update(projectId, next);

    const payload: ProjectUpdatedPayload = {
      projectId,
      changed: {
        ...(patch.name ? { name: next.name } : {}),
      },
      updatedAt: next.updatedAt?.toISOString() || "",
    };
    this.events.publish<ProjectUpdatedPayload>(PROJECT_UPDATED, payload);

    return result;
  }
}
