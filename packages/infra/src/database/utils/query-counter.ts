import { prisma } from "../prisma.client";

export async function withPrismaQueryCount<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; queryCount: number }> {
  let count = 0;

  // Just attach listener - let it garbage collect naturally
  prisma.$on("query", () => {
    count += 1;
  });

  const result = await fn();

  console.log(`🔍 Repository executed ${count} Prisma queries`);

  return { result, queryCount: count };
}
