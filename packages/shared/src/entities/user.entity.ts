export interface User {
  id: string;
  keycloakUserId?: string | null;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date; // set by DB via prisma @updatedAt
  deletedAt?: Date | null; // soft-delete timestamp
}
