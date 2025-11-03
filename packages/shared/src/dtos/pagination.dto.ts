// @repo/shared/src/dtos/pagination.dto.ts
import { z } from "zod";

// Offset pagination: limit/offset with sane defaults and caps
export const OffsetPaginationDto = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  includeDeleted: z.coerce.boolean().optional().default(false),
  sortBy: z
    .enum(["createdAt", "name", "email"])
    .optional()
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Cursor pagination: take/cursor where take>0 forward, take<0 backward
export const CursorPaginationDto = z.object({
  q: z.string().trim().min(1).optional(),
  take: z.coerce.number().int().min(-100).max(100).default(20), // negative = backward
  cursor: z
    .object({ id: z.string().trim().min(1) })
    .or(
      z
        .string()
        .trim()
        .min(1)
        .transform((id) => ({ id })),
    )
    .optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(["id", "createdAt"]).optional().default("id"), // use unique field for cursor ordering
  sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
});

export type TOffsetPagination = z.infer<typeof OffsetPaginationDto>;
export type TCursorPagination = z.infer<typeof CursorPaginationDto>;
