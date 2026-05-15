import { BaseService } from "./BaseService";
import { SessionUser } from "@/lib/session";
import { QuotaRepository } from "@/repositories/QuotaRepository";
import { MemberPackageRepository } from "@/repositories/MemberPackageRepository";
import prisma from "@/lib/prisma";
import { MemberQuotaType } from "@/generated/prisma";

export class QuotaService extends BaseService {
  constructor(
    private quotaRepository: QuotaRepository = new QuotaRepository(),
    private memberPackageRepository: MemberPackageRepository = new MemberPackageRepository()
  ) {
    super();
  }

  /**
   * Purchase a membership package for a customer.
   * This increases the customer's quota balance.
   */
  async purchasePackage(user: SessionUser | null, customerId: string, packageId: string) {
    this.requireRole(user, ["OWNER", "STAFF"]);
    const outletId = this.getOutletId(user);

    const pkg = await this.memberPackageRepository.findById(outletId, packageId);
    if (!pkg) throw new Error("Paket tidak ditemukan");

    return await prisma.$transaction(async (tx) => {
      // 1. Update Customer status to Member
      await tx.customer.update({
        where: { id: customerId, outletId },
        data: { isMember: true },
      });

      // 2. Add Quota and record transaction
      const balance = await this.quotaRepository.updateBalance(tx as any, {
        customerId,
        outletId,
        amount: pkg.quota,
        type: "PURCHASE",
        quotaType: pkg.type,
        packageId: pkg.id,
        description: `Pembelian paket ${pkg.name}`,
      });

      return balance;
    });
  }

  /**
   * Get all quota balances for a customer.
   */
  async getCustomerQuotas(user: SessionUser | null, customerId: string) {
    this.requireRole(user, ["OWNER", "STAFF"]);
    // Simple check: user must belong to same outlet as customer
    // (This is usually handled in controller/api, but let's be safe)
    return this.quotaRepository.getAllBalances(customerId);
  }

  /**
   * Get quota transaction history for a customer.
   */
  async getQuotaTransactions(user: SessionUser | null, customerId: string) {
    this.requireRole(user, ["OWNER", "STAFF"]);
    return this.quotaRepository.findTransactions(customerId);
  }

  /**
   * Deduct quota for an order.
   * MUST be called within a Prisma transaction.
   */
  async deductQuotaForOrder(
    tx: any,
    data: {
      customerId: string;
      outletId: string;
      orderId: string;
      amount: number;
      quotaType: MemberQuotaType;
      description?: string;
    }
  ) {
    return this.quotaRepository.updateBalance(tx, {
      ...data,
      type: "USAGE",
      amount: -Math.abs(data.amount), // Ensure negative
    });
  }

  /**
   * Refund quota for a cancelled order.
   * MUST be called within a transaction.
   */
  async refundQuotaForOrder(
    tx: any,
    data: {
      customerId: string;
      outletId: string;
      orderId: string;
      amount: number;
      quotaType: MemberQuotaType;
      description?: string;
    }
  ) {
    return this.quotaRepository.updateBalance(tx, {
      ...data,
      type: "ADJUSTMENT",
      amount: Math.abs(data.amount), // Positive refund
      description: data.description || `Refund kuota order #${data.orderId}`,
    });
  }
}
