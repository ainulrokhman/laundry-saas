import prisma from "@/lib/prisma";
import { Prisma, MemberQuotaType, QuotaTransactionType } from "@/generated/prisma";

export class QuotaRepository {
  async getBalance(customerId: string, type: MemberQuotaType) {
    return prisma.customerQuota.findUnique({
      where: {
        customerId_type: { customerId, type },
      },
    });
  }

  async getAllBalances(customerId: string) {
    return prisma.customerQuota.findMany({
      where: { customerId },
    });
  }

  async findTransactions(customerId: string, limit = 20) {
    return prisma.quotaTransaction.findMany({
      where: { customerId },
      include: {
        package: {
          select: { name: true },
        },
        order: {
          select: { trackingCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Update quota balance and record transaction.
   * MUST be called within a transaction if used with other DB operations.
   */
  async updateBalance(
    tx: Prisma.TransactionClient,
    data: {
      customerId: string;
      outletId: string;
      amount: number;
      type: QuotaTransactionType;
      quotaType: MemberQuotaType;
      packageId?: string;
      orderId?: string;
      description?: string;
    }
  ) {
    // 1. Update or Create Balance
    const balance = await tx.customerQuota.upsert({
      where: {
        customerId_type: {
          customerId: data.customerId,
          type: data.quotaType,
        },
      },
      update: {
        balance: { increment: data.amount },
      },
      create: {
        customerId: data.customerId,
        type: data.quotaType,
        balance: data.amount,
      },
    });

    if (balance.balance < 0) {
      throw new Error("Saldo kuota tidak mencukupi");
    }

    // 2. Record Transaction
    await tx.quotaTransaction.create({
      data: {
        customerId: data.customerId,
        outletId: data.outletId,
        packageId: data.packageId,
        orderId: data.orderId,
        amount: data.amount,
        type: data.type,
        quotaType: data.quotaType,
        description: data.description,
      },
    });

    return balance;
  }
}
