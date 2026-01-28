
import { CustomerRepository } from '@/repositories/CustomerRepository';

export class CustomerService {
    constructor(private customerRepo: CustomerRepository) { }

    async listCustomers(outletId: string, params: { search?: string; page?: number; limit?: number }) {
        return this.customerRepo.findAll({
            outletId,
            ...params,
        });
    }

    async getCustomer(outletId: string, id: string) {
        return this.customerRepo.findById(outletId, id);
    }

    async createCustomer(
        outletId: string,
        data: { name: string; phone?: string; email?: string; address?: string }
    ) {
        // Normalize phone if present
        const phone = data.phone?.trim() ? data.phone.trim() : undefined;

        // Check duplicate phone if phone is provided
        if (phone) {
            const existing = await this.customerRepo.findByPhone(outletId, phone);
            if (existing) {
                throw new Error('Nomor telepon sudah terdaftar untuk pelanggan lain.');
            }
        }

        return this.customerRepo.create({
            outletId,
            name: data.name,
            phone,
            email: data.email,
            address: data.address,
        });
    }

    async updateCustomer(
        outletId: string,
        id: string,
        data: { name?: string; phone?: string; email?: string; address?: string }
    ) {
        // Verify existence
        const existing = await this.customerRepo.findById(outletId, id);
        if (!existing) {
            throw new Error('Pelanggan tidak ditemukan.');
        }

        // Check duplicate phone if changing
        const phone = data.phone?.trim() ? data.phone.trim() : undefined;
        if (phone && phone !== existing.phone) {
            const duplicate = await this.customerRepo.findByPhone(outletId, phone);
            if (duplicate) {
                throw new Error('Nomor telepon sudah terdaftar untuk pelanggan lain.');
            }
        }

        // Since update requires unique ID, and we verified ownership via findById(outletId, id)
        // We can safely call repository update using only ID (Prisma limitation on update where)
        // But repository logic discussed using updateMany or separate verify. 
        // Let's implement update in repo using simple update knowing we verified ownership.
        // wait, repo needs to handle the call. 
        // Let's rely on repo.update which effectively does `prisma.customer.update({ where: { id } })` 
        // BUT we must trust `existing` check above protects cross-tenant.

        return this.customerRepo.update(outletId, id, {
            ...data,
            phone, // use normalized phone
        });
    }

    async deleteCustomer(outletId: string, id: string) {
        const existing = await this.customerRepo.findById(outletId, id);
        if (!existing) {
            throw new Error('Pelanggan tidak ditemukan.');
        }

        // Optional: Check if can delete (has orders?)
        if (existing._count?.orders && existing._count.orders > 0) {
            throw new Error('Tidak dapat menghapus pelanggan yang memiliki riwayat order.');
        }

        return this.customerRepo.delete(outletId, id);
    }
}
