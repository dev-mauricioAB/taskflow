import { z } from "zod";
import { ProjectSchema } from "../schemas/project.schema";
import { Id } from "../schemas/user.schema";

// Create: requires ownerId, name; optional description
export const CreateProjectDto = z.object({
  ownerId: Id,
  name: ProjectSchema.shape.name,
  description: ProjectSchema.shape.description.optional(),
});

// Update: all mutable fields optional
export const UpdateProjectDto = z.object({
  name: ProjectSchema.shape.name.optional(),
  description: ProjectSchema.shape.description.optional(),
});

export const ProjectParamsDto = z.object({
  id: Id,
});

export const ProjectQueryDto = z.object({
  ownerId: Id.optional(),
});

export type TCreateProjectDto = z.infer<typeof CreateProjectDto>;
export type TUpdateProjectDto = z.infer<typeof UpdateProjectDto>;
export type TProjectParamsDto = z.infer<typeof ProjectParamsDto>;
export type TProjectQueryDto = z.infer<typeof ProjectQueryDto>;
