/**
 * Transaction DTO
 * 
 * Data Transfer Objects for transaction responses.
 * Ensures sensitive data is scrubbed before sending to client.
 */

import { Transaction, PaymentStatus, PaymentMethod, TransType } from '@/generated/prisma';

export interface TransactionWithRelations extends Transaction {
  order?: {
    id: string;
    trackingCode: string;
    customerName: string | null;
  };
  bankAccount?: {
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  paymentGatewayConfig?: {
    id: string;
    gatewayType: PaymentMethod;
    isActive: boolean;
  };
}

export class TransactionDTO {
  /**
   * Transform transaction to response format
   * Scrubs sensitive data and only includes necessary fields
   */
  static toResponse(transaction: TransactionWithRelations) {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      externalId: transaction.externalId || null,
      gatewayTransactionId: transaction.gatewayTransactionId || null,
      proofUrl: transaction.proofUrl || null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      // Include order info if available (minimal)
      ...(transaction.order && {
        order: {
          id: transaction.order.id,
          trackingCode: transaction.order.trackingCode,
          customerName: transaction.order.customerName || null,
        },
      }),
      // Include bank account info if available (for TRANSFER payments)
      ...(transaction.bankAccount && {
        bankAccount: {
          id: transaction.bankAccount.id,
          bankName: transaction.bankAccount.bankName,
          accountNumber: this.maskAccountNumber(transaction.bankAccount.accountNumber),
          accountName: transaction.bankAccount.accountName,
        },
      }),
      // Include payment gateway info if available (minimal, no sensitive keys)
      ...(transaction.paymentGatewayConfig && {
        paymentGateway: {
          id: transaction.paymentGatewayConfig.id,
          gatewayType: transaction.paymentGatewayConfig.gatewayType,
          isActive: transaction.paymentGatewayConfig.isActive,
        },
      }),
      // Never include: gatewayResponse, webhookData (sensitive debugging data)
    };
  }

  /**
   * Transform transaction to admin response format (includes more details)
   * For SuperAdmin or Owner only
   */
  static toAdminResponse(transaction: TransactionWithRelations) {
    const base = this.toResponse(transaction);
    return {
      ...base,
      // Include gateway transaction ID for admin
      gatewayTransactionId: transaction.gatewayTransactionId || null,
      // Include external ID for admin
      externalId: transaction.externalId || null,
      // Full bank account number for admin (not masked)
      ...(transaction.bankAccount && {
        bankAccount: {
          ...base.bankAccount,
          accountNumber: transaction.bankAccount.accountNumber, // Full number for admin
        },
      }),
    };
  }

  /**
   * Transform array of transactions to response format
   */
  static toResponseArray(transactions: TransactionWithRelations[]) {
    return transactions.map((transaction) => this.toResponse(transaction));
  }

  /**
   * Mask account number for privacy (e.g., "1234567890" -> "1234****7890")
   */
  private static maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return '****';
    const start = accountNumber.slice(0, 4);
    const end = accountNumber.slice(-4);
    return `${start}****${end}`;
  }
}
