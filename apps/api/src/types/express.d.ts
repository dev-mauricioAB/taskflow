// apps/api/src/types/keycloak.d.ts

declare namespace Express {
  interface Request {
    kauth?: {
      grant?: {
        access_token?: {
          content?: {
            sub: string; // keycloakUserId
            email?: string;
            name?: string;
            realm_access?: {
              roles?: string[];
            };
            resource_access?: {
              [clientId: string]: { roles?: string[] };
            };
          };
        };
      };
    };
  }
}
