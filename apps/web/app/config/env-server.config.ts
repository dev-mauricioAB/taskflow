// app/config/env-server.config.ts  (server-only)
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  NEXTAUTH_URL: z.url(),
  NEXTAUTH_SECRET: z.string().min(32),

  KEYCLOAK_REALM: z.string(),
  KEYCLOAK_CLIENT_ID: z.string(),
  KEYCLOAK_CLIENT_SECRET: z.string(),
  KEYCLOAK_URL: z.url(), // e.g. http://localhost:8081
});

const serverResult = serverSchema.safeParse(process.env);

if (!serverResult.success) {
  console.error(
    "❌ Invalid web server env vars:",
    serverResult.error.flatten(),
  );
  throw new Error("Invalid web server env vars");
}

export const serverEnv = serverResult.data;
