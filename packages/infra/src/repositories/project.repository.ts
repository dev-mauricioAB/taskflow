import { prisma } from "../database/prisma.client";
import { Project, TCreateProjectDto, TUpdateProjectDto } from "@repo/shared";
import { IProjectRepository } from "../interfaces/IProjectRepository";
import { NewEntity } from "../interfaces";

export class ProjectRepository implements IProjectRepository {
  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  }

  async save(project: Project): Promise<void> {
    if (project.id) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          // include only mutable fields from your Project schema
          name: project.name,
          description: project.description,
          ownerId: project.ownerId,
          // ...other updatable fields
        },
      });
      return;
    }

    await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        // ...other creatable fields
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async create(dto: TCreateProjectDto): Promise<Project> {
    const data: NewEntity<Project> = {
      ownerId: dto.ownerId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
    };
    // DB populates createdAt/updatedAt; deletedAt remains null on insert [web:151][web:81]
    return prisma.project.create({ data: data as any });
  }

  async findAll(): Promise<Project[]> {
    return prisma.project.findMany();
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    return prisma.project.findMany({ where: { ownerId } });
  }

  async softDelete(projectId: string, when: Date): Promise<boolean> {
    const res = await prisma.project.updateMany({
      where: { id: projectId, deletedAt: null },
      data: { deletedAt: when },
    });
    return res.count > 0; // idempotent soft delete [web:74][web:81]
  }

  async hardDelete(projectId: string): Promise<boolean> {
    const res = await prisma.project.deleteMany({ where: { id: projectId } });
    return res.count > 0; // idempotent hard delete [web:186][web:74]
  }

  async exists(projectId: string): Promise<boolean> {
    const row = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    return !!row; // fast existence check [web:81]
  }

  async isSoftDeleted(projectId: string): Promise<boolean> {
    const row = await prisma.project.findUnique({
      where: { id: projectId },
      select: { deletedAt: true },
    });
    return !!row?.deletedAt; // check tombstone marker [web:81]
  }

  async update(
    projectId: string,
    dto: TUpdateProjectDto,
  ): Promise<{ changed: Record<string, unknown> }> {
    const patch = {} as NewEntity<Project>;
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.description !== undefined)
      patch.description = dto.description?.trim();

    if (Object.keys(patch).length === 0) return { changed: {} }; // no-op patch [web:120]

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: patch,
      select: {
        id: true,
        name: true,
        description: true,
        ownerId: true,
        updatedAt: true,
      },
    }); // Prisma returns updated fields and timestamps [web:81]

    const changed: Record<string, unknown> = {};
    for (const k of Object.keys(patch)) {
      if (k in updated) changed[k] = (updated as any)[k];
    }
    changed["updatedAt"] = updated.updatedAt;
    return { changed }; // report changed fields and updatedAt [web:120]
  }
}
