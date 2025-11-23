// interfaces/IProjectRepository.ts
import {
  CursorListParams,
  CursorPage,
  OffsetListParams,
  OffsetPage,
  Project,
  ProjectSortBy,
} from "@repo/shared";
import { IRepository } from "./IRepository";

export type ProjectFilters = {
  q?: string;
  ownerId?: string;
  includeDeleted?: boolean;
};

export interface IProjectRepository extends IRepository<Project, string> {
  /// Unpaginated and offset (kept for compatibility)
  findByOwnerId(ownerId: string): Promise<Project[]>;
  findAll(
    params: OffsetListParams<ProjectSortBy> & {
      ownerId?: string;
    },
  ): Promise<OffsetPage<Project, ProjectSortBy>>;

  // Cursor-based
  findAllCursor(
    params: CursorListParams<ProjectSortBy> & ProjectFilters
  ): Promise<CursorPage<Project, ProjectSortBy>>;
}
