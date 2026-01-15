// app/config/env-public.config.ts
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_KEYCLOAK_REALM: z.string().optional(),
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_KEYCLOAK_URL: z.url().optional(),
});

const publicResult = publicSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_KEYCLOAK_REALM: process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  NEXT_PUBLIC_KEYCLOAK_URL: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
});

if (!publicResult.success) {
  console.error(
    "❌ Invalid web public env vars:",
    publicResult.error.flatten(),
  );
  throw new Error("Invalid web public env vars");
}

export const publicEnv = publicResult.data;
