const KEYCLOAK_URL = "http://localhost:8081"; // ← was 8080, matches KEYCLOAK_AUTH_SERVER_URL
const REALM = "taskflow-dev"; // ← matches KEYCLOAK_REALM
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "change_me";
const SEED_PASSWORD = "Test@1234";

import * as dotenv from "dotenv";
import * as path from "path";

// MUST be before any other import that touches Prisma
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function getAdminToken(): Promise<string> {
  const res = await fetch(
    `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: ADMIN_USER,
        password: ADMIN_PASSWORD,
      }),
    },
  );

  const data = (await res.json()) as { access_token?: string; error?: string };

  // Add this temporarily
  if (!data.access_token) {
    throw new Error(`Failed to get admin token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function createKeycloakUser(
  token: string,
  user: { name: string; email: string },
): Promise<string> {
  const [firstName, ...rest] = user.name.split(" ");

  const res = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: user.email,
      email: user.email,
      firstName: firstName,
      lastName: rest.join(" ") || firstName,
      enabled: true,
      emailVerified: true,
      credentials: [
        {
          type: "password",
          value: SEED_PASSWORD,
          temporary: false,
        },
      ],
    }),
  });

  // Keycloak returns the new user URL in the Location header
  // e.g. http://localhost:8080/admin/realms/taskflow/users/<uuid>
  const location = res.headers.get("location") ?? "";
  const keycloakId = location.split("/").pop();

  if (!keycloakId) {
    throw new Error(
      `Failed to create Keycloak user for ${user.email}: ${await res.text()}`,
    );
  }

  return keycloakId;
}

async function main() {
  const { prisma } = await import("@repo/infra");

  console.log("🔑 Getting Keycloak admin token...");
  const token = await getAdminToken();

  const users = await prisma.user.findMany({
    where: { keycloakUserId: null },
    select: { id: true, name: true, email: true },
  });

  console.log(`👤 Found ${users.length} users without Keycloak ID`);

  for (const user of users) {
    try {
      const keycloakId = await createKeycloakUser(token, user);

      await prisma.user.update({
        where: { id: user.id },
        data: { keycloakUserId: keycloakId },
      });

      console.log(`✅ ${user.email} → ${keycloakId}`);
    } catch (err) {
      console.error(`❌ ${user.email}: ${err}`);
    }
  }

  await prisma.$disconnect();
  console.log("✅ Done.");
}

main();
