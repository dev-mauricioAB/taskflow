import { Project } from "@repo/shared";
import { IRepository } from "./IRepository";

export interface IProjectRepository extends IRepository<Project, string> {
  findAll(): Promise<Project[]>;
  findByOwnerId(ownerId: string): Promise<Project[]>;
}
