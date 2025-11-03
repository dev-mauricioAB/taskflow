import { z } from "zod";
import { UserSchema, Id } from "../schemas/user.schema";
import { CursorPaginationDto, OffsetPaginationDto } from "./pagination.dto";

// Create: client supplies name/email; server sets id/createdAt/updatedAt
export const CreateUserDto = z.object({
  name: UserSchema.shape.name,
  email: UserSchema.shape.email,
});

export const UpdateUserDto = z.object({
  // Allow partial updates; no id in body
  name: UserSchema.shape.name.optional(),
  email: UserSchema.shape.email.optional(),
});

export const UserParamsDto = z.object({
  id: Id,
});

export const UserQueryDto = z.object({
  // add pagination/sorting when needed
  q: z.string().trim().optional(),
});

export type TCreateUserDto = z.infer<typeof CreateUserDto>;
export type TUpdateUserDto = z.infer<typeof UpdateUserDto>;
export type TUserParamsDto = z.infer<typeof UserParamsDto>;
export type TUserQueryDto = z.infer<typeof UserQueryDto>;

// Users may add resource-specific filters later (role, status, etc.)
export const UserListOffsetQueryDto = OffsetPaginationDto.extend({});
export const UserListCursorQueryDto = CursorPaginationDto.extend({});

export type TUserListOffsetQuery = z.infer<typeof UserListOffsetQueryDto>;
export type TUserListCursorQuery = z.infer<typeof UserListCursorQueryDto>;
