export interface Project {
  id: string;
  ownerId: string; // User.id
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null; // soft-delete timestamp
}
