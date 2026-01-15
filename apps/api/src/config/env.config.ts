import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string(), // keep as string; some drivers dislike strict URL parsing [web:54]
  PORT: z.string().default("8080"),

  // Keycloak
  KEYCLOAK_REALM: z.string(),
  KEYCLOAK_AUTH_SERVER_URL: z.url(),
  KEYCLOAK_SSL_REQUIRED: z.enum(["none", "external", "all"]).default("none"),
  KEYCLOAK_RESOURCE: z.string(),                // client id
  KEYCLOAK_BEARER_ONLY: z
    .enum(["true", "false"])
    .default("true")
    .transform(v => v === "true"),
  KEYCLOAK_CONFIDENTIAL_PORT: z
    .string()
    .default("0")
    .transform(v => Number(v)),
  KEYCLOAK_REALM_PUBLIC_KEY: z.string().optional(),
  // secrets
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;