/**
 * Service DTO
 * 
 * Data Transfer Objects for service responses.
 * Ensures sensitive data is scrubbed before sending to client.
 */

import { Service } from '@/generated/prisma';

export interface ServiceWithRelations extends Service {
  outlet?: {
    id: string;
    name: string;
    slug: string;
  };
}

export class ServiceDTO {
  /**
   * Transform service to response format
   * Scrubs sensitive data and only includes necessary fields
   */
  static toResponse(service: ServiceWithRelations) {
    return {
      id: service.id,
      name: service.name,
      type: service.type,
      price: service.price,
      unit: service.unit || null,
      description: service.description || null,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      // Include outlet info if available (minimal)
      ...(service.outlet && {
        outlet: {
          id: service.outlet.id,
          name: service.outlet.name,
          slug: service.outlet.slug,
        },
      }),
    };
  }

  /**
   * Transform service to public response format (for public outlet page)
   * Only includes active services and minimal data
   */
  static toPublicResponse(service: ServiceWithRelations) {
    // Only return active services for public
    if (!service.isActive) {
      return null;
    }

    return {
      id: service.id,
      name: service.name,
      type: service.type,
      price: service.price,
      unit: service.unit || null,
      description: service.description || null,
      // Never include: outletId, createdAt, updatedAt for public
    };
  }

  /**
   * Transform array of services to response format
   */
  static toResponseArray(services: ServiceWithRelations[]) {
    return services.map((service) => this.toResponse(service));
  }

  /**
   * Transform array of services to public response format
   * Filters out inactive services
   */
  static toPublicResponseArray(services: ServiceWithRelations[]) {
    return services
      .map((service) => this.toPublicResponse(service))
      .filter((service) => service !== null);
  }
}
