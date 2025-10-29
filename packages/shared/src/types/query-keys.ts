/**
 * Query keys for TanStack Query
 * Helps prevent typo errors in key strings
 */
export const QUERY_KEYS = {
  USERS: "users",
  TASKS: "tasks",
} as const;

export type QueryKeys = (typeof QUERY_KEYS)[keyof typeof QUERY_KEYS];
