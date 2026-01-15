import session from "express-session";
import KeycloakConnect from "keycloak-connect";
import type { RequestHandler } from "express";
import { env, makeKeycloakConfig } from "./config";

const memoryStore = new session.MemoryStore();

export const sessionMiddleware: RequestHandler = session({
  secret: env.SESSION_SECRET || "",
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
});

export const keycloak = new KeycloakConnect(
  { store: memoryStore },
  makeKeycloakConfig(),
);

export const keycloakMiddleware = keycloak.middleware({
  logout: "/logout",
  admin: "/kcadm",
});

// Convenience wrappers to protect routes
export const protect = () => keycloak.protect();
export const protectRole = (role: string) => keycloak.protect(role);

// Debug >>: Log Keycloak token validation errors
// const gm = (keycloak as any).grantManager;
// const origValidateToken = gm.validateToken?.bind(gm);

// if (origValidateToken) {
//   gm.validateToken = async function (...args: any[]) {
//     try {
//       return await origValidateToken(...args);
//     } catch (err: any) {
//       console.error("KEYCLOAK ERROR:", err?.message || err);
//       throw err;
//     }
//   };
// }
