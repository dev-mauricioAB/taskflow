import { z } from "zod";

// Common primitives
export const Id = z.string().cuid2("Invalid id"); // switch to z.string().uuid() if you use UUIDs
export const ISODate = z.coerce.date();

// User
export const UserSchema = z.object({
  id: Id,
  name: z.string().trim().min(1, "Name required"),
  email: z.email("Invalid email"),
  createdAt: ISODate,
  updatedAt: ISODate.optional(), // optional, not null by default
});

export type TUser = z.infer<typeof UserSchema>;
