/**
 * User DTO
 *
 * Data Transfer Objects untuk response user.
 * Wajib scrub field sensitif: pin, isPinSet, failedLoginAttempts, lockedUntil, dll.
 */

import { Role, User } from '@/generated/prisma';

type UserWithOutlet = User & {
  outlet?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export class UserDTO {
  static toResponse(user: UserWithOutlet) {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      outletId: user.outletId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      pinChangedAt: user.pinChangedAt ? user.pinChangedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      outlet: user.outlet
        ? {
            id: user.outlet.id,
            name: user.outlet.name,
            slug: user.outlet.slug,
          }
        : null,
    };
  }

  static toResponseArray(users: UserWithOutlet[]) {
    return users.map((u) => this.toResponse(u));
  }

  static roleLabel(role: Role): string {
    switch (role) {
      case 'SUPERADMIN':
        return 'SuperAdmin';
      case 'OWNER':
        return 'Owner';
      case 'STAFF':
        return 'Staff';
      default:
        return role;
    }
  }
}

