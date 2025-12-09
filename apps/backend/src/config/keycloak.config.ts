import { KeycloakConfig } from "keycloak-connect";
import { env } from "./env.config";

export const makeKeycloakConfig = (): KeycloakConfig => ({
  realm: env.KEYCLOAK_REALM,
  "auth-server-url": env.KEYCLOAK_AUTH_SERVER_URL,
  "ssl-required": env.KEYCLOAK_SSL_REQUIRED,
  resource: env.KEYCLOAK_RESOURCE,
  "bearer-only": env.KEYCLOAK_BEARER_ONLY,
  "confidential-port": env.KEYCLOAK_CONFIDENTIAL_PORT,
});