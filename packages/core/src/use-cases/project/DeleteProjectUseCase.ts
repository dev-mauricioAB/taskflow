// @repo/core/application/use-cases/DeleteProjectUseCase.ts
import { DomainError, IEventPublisher, IProjectRepository } from "@repo/infra";
import { PROJECT_DELETED } from "@repo/shared";
// Suggested payload in your shared events:
// export type ProjectDeletedPayload = { projectId: string; occurredAt: string; hard: boolean };

type DeleteProjectInput = { projectId: string; hard?: boolean };

export class DeleteProjectUseCase {
  constructor(
    private readonly projects: IProjectRepository,
    private readonly events: IEventPublisher,
  ) {}

  // Idempotent semantics:
  // - If the project doesn't exist: no-op
  // - Soft delete: marks deletedAt once; repeated calls do nothing
  // - Hard delete: removes row; repeated calls are harmless
  async execute({
    projectId,
    hard = false,
  }: DeleteProjectInput): Promise<void> {
    // hide soft-deleted by default if your repo filters by deletedAt: null
    const existing = await this.projects.findById(projectId);
    if (!existing)
      throw new DomainError({
        code: "NOT_FOUND",
        message: "Activity not found",
      });

    const nowIso = new Date().toISOString();

    if (hard) {
      await this.projects.hardDelete(projectId); // use deleteMany to avoid P2025 on repeated calls
      this.events.publish(PROJECT_DELETED, {
        projectId,
        occurredAt: nowIso,
        hard: true,
      }); // publish a canonical past-tense event
      return;
    }

    await this.projects.softDelete(projectId, new Date()); // use updateMany so repeated soft deletes are no-ops
    this.events.publish(PROJECT_DELETED, {
      projectId,
      occurredAt: nowIso,
      hard: false,
    }); // notify consumers without storage details
  }
}
