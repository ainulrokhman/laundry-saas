import { Customer, Order } from "@/generated/prisma";

type CustomerWithOrders = Customer & {
  _count?: { orders: number };
  orders?: Pick<
    Order,
    | "id"
    | "trackingCode"
    | "status"
    | "paymentStatus"
    | "totalAmount"
    | "createdAt"
    | "completedAt"
  >[];
};

export class CustomerDTO {
  static toResponse(customer: Customer & { _count?: { orders: number } }) {
    return {
      id: customer.id,
      outletId: customer.outletId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      _count: customer._count,
    };
  }

  static toResponseWithOrders(customer: CustomerWithOrders) {
    return {
      ...this.toResponse(customer),
      orders:
        customer.orders?.map((order) => ({
          id: order.id,
          trackingCode: order.trackingCode,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          completedAt: order.completedAt,
        })) || [],
    };
  }

  static toResponseList(customers: Customer[]) {
    return customers.map((c) => this.toResponse(c));
  }
}
