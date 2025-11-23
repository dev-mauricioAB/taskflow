import { z } from "zod";
import { UserSchema, Id } from "../schemas/user.schema";

// Create: client supplies name/email; server sets id/createdAt/updatedAt
export const CreateUserDto = z
  .object({
    name: UserSchema.shape.name,
    email: UserSchema.shape.email,
  })
  .strict();

export const UpdateUserDto = z
  .object({
    // Allow partial updates; no id in body
    name: UserSchema.shape.name.optional(),
    email: UserSchema.shape.email.optional(),
  })
  .strict();

export const UserParamsDto = z
  .object({
    id: Id,
  })
  .strict();

export const UserQueryDto = z
  .object({
    // add pagination/sorting when needed
    q: z.string().trim().optional(),
  })
  .strict();

export type TCreateUserDto = z.infer<typeof CreateUserDto>;
export type TUpdateUserDto = z.infer<typeof UpdateUserDto>;
export type TUserParamsDto = z.infer<typeof UserParamsDto>;
export type TUserQueryDto = z.infer<typeof UserQueryDto>;
