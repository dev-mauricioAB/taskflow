// @repo/core/application/ports/IRepository.ts

/**
 * Generic repository port for aggregate/entities.
 * T = entity type (value handled by the repository)
 * ID = identifier type (e.g., string, number, UUID)
 */

// Yields K if it exists on T, otherwise never (safe for Omit/Pick).
type KeyIfPresent<T, K extends PropertyKey> = Extract<K, keyof T>;

// Common system-managed fields you don’t want on create inputs.
type SystemKeys<T> =
  | KeyIfPresent<T, "createdAt">
  | KeyIfPresent<T, "updatedAt">
  | KeyIfPresent<T, "deletedAt">;

// Preserve your original id handling.
type IdKey<T> = Extract<"id", keyof T>;

/**
 * NewEntity<T> for create():
 * - Omits id and system-managed timestamp fields if present on T
 * - Re-adds id as optional when T has an id
 */
export type NewEntity<T> = Omit<T, IdKey<T> | SystemKeys<T>> &
  Partial<Pick<T, IdKey<T>>>;

export interface IRepository<T, ID> {
  /**
   * Persists a brand-new entity. Returns the created entity,
   * allowing infra to populate generated fields (id, timestamps).
   */
  create(entity: NewEntity<T>): Promise<T>;

  /**
   * Persists changes to an existing entity (upsert-friendly if your infra supports it).
   * Returns void to reinforce that the caller already holds the updated value.
   */
  save(entity: T): Promise<void>;

  /**
   * Deletes the entity by id. Resolves even if the id doesn’t exist.
   */
  delete(id: ID): Promise<void>;

  /**
   * Finds an entity by id or returns null if not found.
   */
  findById(id: ID): Promise<T | null>;
  /**
   * Marks the user as deleted (soft delete). Returns true if a change occurred.
   */
  softDelete(id: string, when: Date): Promise<boolean>;

  /**
   * Permanently removes the user (hard delete). Returns true if a row was removed.
   */
  hardDelete(id: string): Promise<boolean>;

  /**
   * Utility helpers for idempotency.
   */
  exists(id: string): Promise<boolean>;
  isSoftDeleted(id: string): Promise<boolean>;
  update(id: string, patch: NewEntity<Partial<T>>): Promise<Partial<T>>;
}
