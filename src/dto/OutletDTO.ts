/**
 * Outlet DTO
 * 
 * Data Transfer Objects for outlet responses.
 * Ensures sensitive data is scrubbed before sending to client.
 */

import { Outlet } from '@/generated/prisma';

export class OutletDTO {
  /**
   * Transform outlet to response format
   */
  static toResponse(outlet: Outlet & { users?: any[]; bankAccounts?: any[]; paymentGatewayConfigs?: any[] }) {
    return {
      id: outlet.id,
      name: outlet.name,
      slug: outlet.slug,
      address: outlet.address,
      isPro: outlet.isPro,
      createdAt: outlet.createdAt.toISOString(),
      updatedAt: outlet.updatedAt.toISOString(),
      // Include related data if available
      ...(outlet.users && {
        users: outlet.users.map((user: any) => ({
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        })),
        userCount: outlet.users.length,
      }),
      ...(outlet.bankAccounts && {
        bankAccounts: outlet.bankAccounts.map((account: any) => ({
          id: account.id,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          isActive: account.isActive,
        })),
        bankAccountCount: outlet.bankAccounts.length,
      }),
      ...(outlet.paymentGatewayConfigs && {
        paymentGatewayConfigs: outlet.paymentGatewayConfigs.map((config: any) => ({
          id: config.id,
          gatewayType: config.gatewayType,
          isActive: config.isActive,
        })),
        paymentGatewayCount: outlet.paymentGatewayConfigs.length,
      }),
    };
  }

  /**
   * Transform array of outlets to response format
   */
  static toResponseArray(outlets: (Outlet & { users?: any[] })[]) {
    return outlets.map((outlet) => this.toResponse(outlet));
  }
}
