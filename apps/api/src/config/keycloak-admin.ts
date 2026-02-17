import KcAdminClient from "@keycloak/keycloak-admin-client";
import { env } from "./env.config";

export const kcAdmin = new KcAdminClient({
  baseUrl: env.KEYCLOAK_AUTH_SERVER_URL,
  realmName: env.KEYCLOAK_REALM,
});

export async function authKeycloakAdmin() {
  await kcAdmin.auth({
    grantType: "client_credentials",
    clientId: env.KEYCLOAK_RESOURCE,
    clientSecret: env.KEYCLOAK_CLIENT_SECRET,
  });
}
