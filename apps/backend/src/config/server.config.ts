import { env } from "./env.config";

export const serverConfig = {
  port: Number(env.PORT) || 8080,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
};
