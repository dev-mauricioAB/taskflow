import { prisma } from "../database/prisma.client";
import { Project } from "@repo/shared";
import { IProjectRepository } from "../interfaces/IProjectRepository";

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

  async create(project: Project): Promise<Project> {
    return prisma.project.create({ data: project });
  }

  async findAll(): Promise<Project[]> {
    return prisma.project.findMany();
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    return prisma.project.findMany({ where: { ownerId } });
  }
}
