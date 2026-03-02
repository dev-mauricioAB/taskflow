declare namespace Express {
  interface AuthUser {
    id: string; // internal DB id — use this everywhere
    keycloakUserId: string;
    email: string;
    name: string;
    roles: string[];
  }

  interface Request {
    authUser?: AuthUser;
    kauth?: {
      grant?: {
        access_token?: {
          content?: {
            sub: string;
            email?: string;
            name?: string;
            realm_access?: { roles?: string[] };
            resource_access?: { [clientId: string]: { roles?: string[] } };
          };
        };
      };
    };
  }
}
