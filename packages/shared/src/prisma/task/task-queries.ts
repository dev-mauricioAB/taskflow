import { DEFAULT_ACTIVITY_LIMIT } from "../../constants";
import { TProject, TUser } from "../../schemas";

export const TASK_USER_SELECT: Partial<Record<keyof TUser, boolean>> = {
  id: true,
  name: true,
  email: true,
} as const;

export const TASK_PROJECT_SELECT: Partial<Record<keyof TProject, boolean>> = {
  id: true,
  name: true,
  description: true,
} as const;

export const TASK_ACTIVITY_SELECT = {
  id: true,
  type: true,
  message: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export const TASK_FIND_MANY_INCLUDE = {
  user: { select: TASK_USER_SELECT },
  project: { select: TASK_PROJECT_SELECT },
  activities: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: DEFAULT_ACTIVITY_LIMIT,
    select: TASK_ACTIVITY_SELECT,
  },
} as const;
