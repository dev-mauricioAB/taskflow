// authOptions.ts
import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import jwt from "jsonwebtoken";
import { serverEnv } from "./config";
import { KeycloakJwtPayload } from "./@types/keycloak-payload";

export const authConfig: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${serverEnv.KEYCLOAK_URL}/realms/${serverEnv.KEYCLOAK_REALM}`,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist provider tokens
      if (account?.access_token) {
        token.accessToken = account.access_token as string | undefined;
        token.idToken = account.id_token as string | undefined;

        // Decode Keycloak access token to read roles
        const decoded = jwt.decode(account.access_token) as KeycloakJwtPayload | null;

        const roles: string[] =
          decoded?.realm_access?.roles ??
          decoded?.resource_access?.[process.env.KEYCLOAK_CLIENT_ID!]?.roles ??
          [];

        token.roles = roles; // <- store roles on JWT
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      // Expose tokens
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;

      // Get roles from JWT
      const anyToken = token;
      const roles: string[] = Array.isArray(anyToken.roles)
        ? anyToken.roles
        : [];

      if (session.user) {
        session.user.roles = roles;
      }

      return session;
    },
  },
};
