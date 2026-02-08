import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

import { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "@auth/core/jwt"; // ou "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    idToken?: string;
    user: DefaultSession["user"] & {
      roles?: string[]; // TODO
    };
  }

  interface User extends DefaultUser {
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    idToken?: string;
    roles?: string[];

    realm_access?: { roles?: string[] };
    resource_access?: {
      [clientId: string]: { roles?: string[] };
    };
  }
}
