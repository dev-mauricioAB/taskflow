import { Project } from "@repo/shared";

export class GetProjectsUseCase {
  // Delegates to repo at controller level (keeps core pure as you did with users)
  execute(projects: Project[]): Project[] {
    return projects;
  }
}