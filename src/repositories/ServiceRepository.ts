/**
 * Service Repository
 * 
 * Data access layer for Service model.
 * All queries include outletId filter for multi-tenancy isolation.
 */

import { prisma } from '@/lib/prisma';
import { Service, Prisma } from '@/generated/prisma';
import { BaseRepository } from './BaseRepository';

export class ServiceRepository extends BaseRepository {
  /**
   * Find service by ID (with outletId filter)
   */
  async findById(outletId: string, id: string): Promise<Service | null> {
    this.ensureOutletId(outletId, 'Service');
    return prisma.service.findFirst({
      where: this.combineFilters(outletId, { id }),
    });
  }

  /**
   * Find all services for an outlet
   */
  async findByOutletId(outletId: string): Promise<Service[]> {
    this.ensureOutletId(outletId, 'Service');
    return prisma.service.findMany({
      where: this.getOutletFilter(outletId),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active services for an outlet
   */
  async findActiveByOutletId(outletId: string): Promise<Service[]> {
    this.ensureOutletId(outletId, 'Service');
    return prisma.service.findMany({
      where: this.combineFilters(outletId, { isActive: true }),
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create new service
   */
  async create(
    outletId: string,
    data: Omit<Prisma.ServiceCreateInput, 'outlet'>
  ): Promise<Service> {
    this.ensureOutletId(outletId, 'Service');
    return prisma.service.create({
      data: {
        ...data,
        outlet: {
          connect: { id: outletId },
        },
      },
    });
  }

  /**
   * Update service
   */
  async update(
    outletId: string,
    id: string,
    data: Prisma.ServiceUpdateInput
  ): Promise<Service> {
    this.ensureOutletId(outletId, 'Service');
    return prisma.service.update({
      where: { id },
      data,
      // Verify outletId matches (safety check)
      ...(await this.findById(outletId, id)
        ? {}
        : { where: { id: 'non-existent' } }), // This will fail if outletId doesn't match
    });
  }

  /**
   * Delete service
   */
  async delete(outletId: string, id: string): Promise<Service> {
    this.ensureOutletId(outletId, 'Service');
    // Verify outletId matches before delete
    const service = await this.findById(outletId, id);
    if (!service) {
      throw new Error('Service not found or access denied');
    }
    return prisma.service.delete({
      where: { id },
    });
  }
}
