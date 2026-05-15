import { prisma } from '@/lib/prisma';
import { Role } from '@/generated/prisma';
import { ExtendedSession } from '@/lib/auth';

/**
 * Validates if the current session has access to an order and returns its outletId.
 * Supports Global Mode for OWNERS.
 */
export async function validateOrderAccess(orderId: string, session: ExtendedSession): Promise<string | null> {
  // 1. If session already has outletId, use it (standard flow)
  if (session.outletId) {
    return session.outletId;
  }

  // 2. If no outletId in session but role is OWNER, check all owned outlets
  if (session.role === Role.OWNER) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { outletId: true },
    });

    if (order) {
      const isOwner = await prisma.outlet.count({
        where: { id: order.outletId, ownerId: session.userId },
      });
      if (isOwner > 0) {
        return order.outletId;
      }
    }
  }

  // 3. Fallback: No access or not an owner in global mode
  return null;
}
