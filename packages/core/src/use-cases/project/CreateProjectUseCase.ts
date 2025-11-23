import {
  DomainError,
  IEventPublisher,
  IProjectRepository,
  NewEntity,
} from "@repo/infra";
import { Project, PROJECT_CREATED, ProjectCreatedPayload } from "@repo/shared";

export class CreateProjectUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(data: NewEntity<Project>): Promise<Project> {
    if (!data.name?.trim()) {
      throw new DomainError({
        code: "VALIDATION_FAILED",
        message: "Project name is required",
      });
    }

    const project = await this.projects.create(data);

    const payload: ProjectCreatedPayload = {
      projectId: project.id,
      // adjust to your Project model; if ownerId/teamId exists, include it
      ownerId: project.ownerId ?? "",
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    };
    this.events.publish<ProjectCreatedPayload>(PROJECT_CREATED, payload);

    return project;
  }
}
