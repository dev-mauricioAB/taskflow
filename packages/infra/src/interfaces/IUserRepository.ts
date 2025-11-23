import { IRepository } from "./IRepository";
import {
  CursorListParams,
  CursorPage,
  OffsetListParams,
  OffsetPage,
  User,
  CursorSortBy,
  UserSortBy,
} from "@repo/shared";

export interface IUserRepository extends IRepository<User, string> {
  // Offset-based
  findAll(
    params: OffsetListParams<UserSortBy>,
  ): Promise<OffsetPage<User, UserSortBy>>;
  // Cursor-based
  findAllCursor(
    params: CursorListParams<CursorSortBy>,
  ): Promise<CursorPage<User, CursorSortBy>>;
  reactivate(userId: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}
