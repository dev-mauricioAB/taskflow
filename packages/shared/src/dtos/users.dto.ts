import { z } from "zod";
import { UserSchema, Id } from "../schemas/user.schema";

// Create: client supplies name/email; server sets id/createdAt/updatedAt
// keycloakUserId optional for IAM-backed creation (admin/internal only)
export const CreateUserDto = z
  .object({
    name: UserSchema.shape.name,
    email: UserSchema.shape.email,
    keycloakUserId: Id.optional(), // ← Optional for Keycloak linkage
  })
  .strict();

export const UpdateUserDto = z
  .object({
    name: UserSchema.shape.name.optional(),
    email: UserSchema.shape.email.optional(),
    keycloakUserId: Id.optional(), // ← Optional for Keycloak linkage
  })
  .strict();

export const UserParamsDto = z
  .object({
    id: Id,
  })
  .strict();

export const UserQueryDto = z
  .object({
    q: z.string().trim().optional(),
  })
  .strict();
  export const ReactivateUserDto = z
  .object({
    email: UserSchema.shape.email,  // Reuses your email validation (required by default)
  })
  .strict();


export type TCreateUserDto = z.infer<typeof CreateUserDto>;
export type TUpdateUserDto = z.infer<typeof UpdateUserDto>;
export type TUserParamsDto = z.infer<typeof UserParamsDto>;
export type TUserQueryDto = z.infer<typeof UserQueryDto>;
export type TReactivateUserDto = z.infer<typeof ReactivateUserDto>;
