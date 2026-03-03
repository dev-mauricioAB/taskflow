import { PrismaClient } from "@prisma/client";

const enableQueryLogs = process.env.PRISMA_EVENT_QUERY !== "false";

export const prisma = new PrismaClient({
  log: enableQueryLogs
    ? [{ level: 'query', emit: 'event' }]
    : [],
});

