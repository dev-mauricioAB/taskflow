import { z } from "zod";
import { UserSchema } from "../schemas/user.schema";

export const CreateKeycloakUserDto = z
  .object({
    name: UserSchema.shape.name,
    email: UserSchema.shape.email,
    password: z.string().min(4, "Password must be at least 4 characters"),
  })
  .strict();

export type TCreateKeycloakUserDto = z.infer<typeof CreateKeycloakUserDto>;
