
import { Customer } from '@/generated/prisma';

export class CustomerDTO {
    static toResponse(customer: Customer) {
        return {
            id: customer.id,
            outletId: customer.outletId,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        };
    }

    static toResponseList(customers: Customer[]) {
        return customers.map((c) => this.toResponse(c));
    }
}
