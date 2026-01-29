/**
 * Service Service
 * 
 * Business logic layer for Service operations.
 * Handles service management with multi-tenancy isolation.
 */

import { ServiceRepository } from '@/repositories/ServiceRepository';
import { BaseService } from './BaseService';
import { Service, Prisma } from '@/generated/prisma';
import { SessionUser } from '@/lib/session';

export class ServiceService extends BaseService {
  constructor(private serviceRepo: ServiceRepository) {
    super();
  }

  /**
   * Get all services for current outlet
   */
  async getServices(user: SessionUser | null): Promise<Service[]> {
    const outletId = this.getOutletId(user);
    return this.serviceRepo.findByOutletId(outletId);
  }

  /**
   * Get active services for current outlet
   */
  async getActiveServices(user: SessionUser | null): Promise<Service[]> {
    const outletId = this.getOutletId(user);
    return this.serviceRepo.findActiveByOutletId(outletId);
  }

  /**
   * Get service by ID (with outlet validation)
   */
  async getServiceById(
    user: SessionUser | null,
    serviceId: string
  ): Promise<Service | null> {
    const outletId = this.getOutletId(user);
    return this.serviceRepo.findById(outletId, serviceId);
  }

  /**
   * Create new service (Owner/SuperAdmin only)
   */
  async createService(
    user: SessionUser | null,
    data: {
      name: string;
      type: string;
      price: number;
      unit?: string;
      description?: string;
      isActive?: boolean;
    }
  ): Promise<Service> {
    // Only Owner and SuperAdmin can create services
    this.requireRole(user, ['OWNER', 'SUPERADMIN']);
    const outletId = this.getOutletId(user);

    return this.serviceRepo.create(outletId, {
      name: data.name,
      type: data.type,
      price: data.price,
      unit: data.unit,
      description: data.description,
      isActive: data.isActive ?? true,
    });
  }

  /**
   * Update service (Owner/SuperAdmin only)
   */
  async updateService(
    user: SessionUser | null,
    serviceId: string,
    data: Partial<{
      name: string;
      type: string;
      price: number;
      unit: string;
      description: string;
      isActive: boolean;
    }>
  ): Promise<Service> {
    // Only Owner and SuperAdmin can update services
    this.requireRole(user, ['OWNER', 'SUPERADMIN']);
    const outletId = this.getOutletId(user);

    return this.serviceRepo.update(outletId, serviceId, data);
  }

  /**
   * Delete service (Owner/SuperAdmin only)
   */
  async deleteService(
    user: SessionUser | null,
    serviceId: string
  ): Promise<Service> {
    // Only Owner and SuperAdmin can delete services
    this.requireRole(user, ['OWNER', 'SUPERADMIN']);
    const outletId = this.getOutletId(user);

    return this.serviceRepo.delete(outletId, serviceId);
  }

  /**
   * Get all services from all owned outlets (Global Mode - OWNER only)
   */
  async getGlobalServices(outletIds: string[]): Promise<(Service & { outlet: { id: string; name: string } })[]> {
    return this.serviceRepo.findByOutletIds(outletIds);
  }

  /**
   * Get active services from all owned outlets (Global Mode - OWNER only)
   */
  async getGlobalActiveServices(outletIds: string[]): Promise<(Service & { outlet: { id: string; name: string } })[]> {
    return this.serviceRepo.findActiveByOutletIds(outletIds);
  }
}
