/**
 * Base repository interface
 * Following Interface Segregation Principle
 * Common operations that all repositories should implement
 */

export interface IBaseRepository<T> {
  /**
   * Find entity by ID
   * @param id - Entity ID
   * @param outletId - Outlet ID for tenant isolation (optional for SUPERADMIN)
   */
  findById(id: string, outletId?: string): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   * @param outletId - Outlet ID for tenant isolation (required for non-SUPERADMIN)
   * @param filters - Additional filters
   */
  findAll(outletId?: string, filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Create new entity
   * @param data - Entity data
   */
  create(data: Omit<T, "id" | "createdAt">): Promise<T>;

  /**
   * Update entity
   * @param id - Entity ID
   * @param data - Updated data
   * @param outletId - Outlet ID for tenant isolation
   */
  update(
    id: string,
    data: Partial<T>,
    outletId?: string
  ): Promise<T | null>;

  /**
   * Delete entity
   * @param id - Entity ID
   * @param outletId - Outlet ID for tenant isolation
   */
  delete(id: string, outletId?: string): Promise<boolean>;
}
