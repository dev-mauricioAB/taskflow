import { prisma } from "../database/prisma.client";
import { Project } from "@repo/shared";

export class ProjectRepository {
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