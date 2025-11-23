import {
  CursorListParams,
  CursorPage,
  CursorSortBy,
  OffsetListParams,
  OffsetPage,
  Task,
  TaskSortBy,
} from "@repo/shared";
import { IRepository } from "./IRepository";

export type FilterTaskInput = {
  projectId?: string;
  userId?: string;
  status?: "todo" | "inProgress" | "done";
};

export interface ITaskRepository extends IRepository<Task, string> {
  // Offset-based
  findAll(
    params: OffsetListParams<TaskSortBy> & FilterTaskInput,
  ): Promise<OffsetPage<Task, TaskSortBy>>;

  // Cursor-based
  findAllCursor(
    params: CursorListParams<CursorSortBy> & FilterTaskInput,
  ): Promise<CursorPage<Task, CursorSortBy>>;

  findByProjectId(projectId: string): Promise<Task[]>;
  markAsCompleted(taskId: string, completedAt: Date): Promise<void>;
}
