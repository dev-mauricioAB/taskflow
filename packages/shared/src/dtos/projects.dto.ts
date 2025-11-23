// projects.dto.ts
import { z } from "zod";
import { ProjectSchema } from "../schemas/project.schema";
import { Id } from "../schemas/user.schema";

// ========== Create / Update / Params / Minimal Query ==========

// Create: requires ownerId, name; optional description
export const CreateProjectDto = z
  .object({
    ownerId: Id,
    name: ProjectSchema.shape.name,
    description: ProjectSchema.shape.description.optional(),
  })
  .strict();

// Update: all mutable fields optional
export const UpdateProjectDto = z
  .object({
    name: ProjectSchema.shape.name.optional(),
    description: ProjectSchema.shape.description.optional(),
  })
  .strict();

// Route params: /projects/:id
export const ProjectParamsDto = z
  .object({
    id: Id,
  })
  .strict();

// Minimal query (kept for backward compatibility)
export const ProjectQueryDto = z
  .object({
    ownerId: Id.optional(),
  })
  .strict();

// ========== Sorting and Pagination DTOs ==========

// Sort direction
export const SortDirEnum = z.enum(["asc", "desc"]);

// Project sort keys (keep in sync with repository allowed sortBy)
export const ProjectSortByEnum = z.enum(["createdAt", "updatedAt", "name"]);

// Offset-based pagination query
export const ProjectOffsetPaginationDto = z
  .object({
    q: z.string().trim().min(1).optional(),
    ownerId: Id.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    includeDeleted: z.coerce.boolean().optional(),
    sortBy: ProjectSortByEnum.optional(),
    sortDir: SortDirEnum.optional(),
  })
  .strict();

// Cursor representation accepts either a plain id or an object with id
const CursorIdObject = z.object({ id: z.string().min(1) });

// Cursor-based pagination query
export const ProjectCursorPaginationDto = z
  .object({
    q: z.string().trim().min(1).optional(),
    ownerId: Id.optional(),
    // signed take: positive for next page, negative for previous page
    take: z.coerce.number().int().min(-100).max(100).optional(),
    cursor: CursorIdObject.or(z.string().min(1)).optional(),
    includeDeleted: z.coerce.boolean().optional(),
    sortBy: ProjectSortByEnum.optional(),
    sortDir: SortDirEnum.optional(),
  })
  .strict();

// ========== Exported TS Types ==========

export type TCreateProjectDto = z.infer<typeof CreateProjectDto>;
export type TUpdateProjectDto = z.infer<typeof UpdateProjectDto>;
export type TProjectParamsDto = z.infer<typeof ProjectParamsDto>;
export type TProjectQueryDto = z.infer<typeof ProjectQueryDto>;

export type TProjectOffsetPagination = z.infer<
  typeof ProjectOffsetPaginationDto
>;
export type TProjectCursorPagination = z.infer<
  typeof ProjectCursorPaginationDto
>;

// ========== Helpful Notes ==========
// - ProjectSortByEnum should match repository sort handling. When sorting by non-unique fields
//   like "name" or timestamps, ensure the repo appends `id` as a tiebreaker in orderBy.
// - For cursor, controllers can normalize a plain string cursor to { id } before passing to the repo.
// - Keep the numeric bounds (limit/take) aligned with your repository caps.
