import { IRepository } from "./IRepository";
import { User } from "@repo/shared";

export interface IUserRepository extends IRepository<User, string> {
  findAll(): Promise<User[]>;
  reactivate(userId: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}
