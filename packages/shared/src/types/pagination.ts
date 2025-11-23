import { SortDir } from "./sort";

export type OffsetListParams<SortBy extends string = string> = {
  q?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  sortBy?: SortBy;
  sortDir?: SortDir;
};

export type OffsetPage<T, SortBy extends string = string> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  sortBy: SortBy;
  sortDir: SortDir;
};

export type CursorListParams<SortBy extends string> = {
  q?: string;
  take?: number; // > 0 forward, < 0 backward
  cursor?: { id: string } | undefined; // stable unique key remains id
  includeDeleted?: boolean;
  sortBy?: SortBy; // can be non-unique; code must add tie-breakers
  sortDir?: SortDir;
};

export type CursorPage<T, SortBy extends string = string> = {
  data: T[];
  nextCursor?: { id: string };
  prevCursor?: { id: string };
  sortBy: SortBy;
  sortDir: SortDir;
};
