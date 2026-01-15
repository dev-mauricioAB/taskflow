import { env } from "./env.config";

export const makeKeycloakConfig = () => ({
  realm: env.KEYCLOAK_REALM, // taskflow-dev
  "auth-server-url": env.KEYCLOAK_AUTH_SERVER_URL, // http://localhost:8080/
  "ssl-required": env.KEYCLOAK_SSL_REQUIRED, // none
  resource: env.KEYCLOAK_RESOURCE, // taskflow-api
  "bearer-only": env.KEYCLOAK_BEARER_ONLY, // true
  "confidential-port": env.KEYCLOAK_CONFIDENTIAL_PORT,
  "realm-public-key": env.KEYCLOAK_REALM_PUBLIC_KEY,
  credentials: env.KEYCLOAK_CLIENT_SECRET
    ? { secret: env.KEYCLOAK_CLIENT_SECRET }
    : undefined,
});
