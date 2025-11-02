import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

export const prisma = mockDeep<PrismaClient>();
export type PrismaMock = DeepMockProxy<PrismaClient>;
