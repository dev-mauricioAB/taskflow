import { prisma } from "@repo/infra";

export const connectDb = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL via Prisma");
  } catch (err) {
    console.error("❌ Prisma failed to connect to PostgreSQL", err);
    process.exit(1);
  }
};
