import type { JwtPayload } from "jsonwebtoken";

export interface KeycloakJwtPayload extends JwtPayload {
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
}
