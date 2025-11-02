export const USER_CREATED = "user.created";
export type UserCreatedPayload = {
  userId: string;
  email: string;
  username?: string;
  createdAt: string; // ISO
};

export const USER_UPDATED = "user.updated";
export type UserUpdatedPayload = {
  userId: string;
  changed: Record<string, unknown>; // or a more specific shape
  updatedAt: string; // ISO
};

export const USER_DELETED = "user.deleted";
export type UserDeletedPayload = {
  userId: string;
  deletedAt: string; // ISO
  hard?: boolean; // optional flag if this was a hard delete
};

// Union if you later want a typed bus map
export type UserEvents = {
  [USER_CREATED]: UserCreatedPayload;
  [USER_UPDATED]: UserUpdatedPayload;
  [USER_DELETED]: UserDeletedPayload;
};
