import session from "express-session";
import KeycloakConnect from "keycloak-connect";
import type { RequestHandler } from "express";
import { env, makeKeycloakConfig } from "./config";

const memoryStore = new session.MemoryStore();

export const sessionMiddleware: RequestHandler = session({
  secret: env.API_CLIENT_SECRET || '',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
});

export const keycloak = new KeycloakConnect({ store: memoryStore }, makeKeycloakConfig());

export const keycloakMiddleware = keycloak.middleware({
  logout: "/logout",
  admin: "/kcadm",
});

// Convenience wrappers to protect routes
export const protect = () => keycloak.protect();
export const protectRole = (role: string) => keycloak.protect(role);
