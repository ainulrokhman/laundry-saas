/**
 * Base service interface
 * Following Interface Segregation Principle
 * Common operations that services may implement
 */

export interface IBaseService<T> {
  /**
   * Get entity by ID
   * @param id - Entity ID
   * @param outletId - Outlet ID for tenant isolation
   */
  getById(id: string, outletId?: string): Promise<T | null>;

  /**
   * Get all entities
   * @param outletId - Outlet ID for tenant isolation
   * @param filters - Additional filters
   */
  getAll(outletId?: string, filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Create new entity
   * @param data - Entity data
   * @param outletId - Outlet ID for tenant isolation
   */
  create(data: Omit<T, "id" | "createdAt">, outletId?: string): Promise<T>;

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
