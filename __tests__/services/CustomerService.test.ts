/**
 * Customer Service Tests
 */

import { CustomerService } from '@/services/dashboard/CustomerService';
import { CustomerRepository } from '@/repositories/CustomerRepository';
import { createTestPrismaClient, cleanupTestDatabase, isDatabaseAvailable } from '../utils/test-db';
import { createOutletData, createUserData } from '../utils/factories';
import { Role } from '@/generated/prisma';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';

const describeDb = isDatabaseAvailable() ? describe : describe.skip;

describeDb('CustomerService', () => {
    const prisma = createTestPrismaClient();
    const repository = new CustomerRepository();
    const service = new CustomerService(repository);

    beforeEach(async () => {
        await cleanupTestDatabase(prisma);
    });

    afterAll(async () => {
        await cleanupTestDatabase(prisma);
        await prisma.$disconnect();
    });

    describe('createCustomer', () => {
        it('should create a customer successfully', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-cust-outlet' }),
            });

            const result = await service.createCustomer(outlet.id, {
                name: 'Test Customer',
                phone: '08123456789',
                email: 'test@example.com',
                address: 'Test Address',
            });

            expect(result.name).toBe('Test Customer');
            expect(result.phone).toBe('08123456789');
            expect(result.outletId).toBe(outlet.id);
        });

        it('should fail if phone number already exists in same outlet', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-cust-dup' }),
            });

            await service.createCustomer(outlet.id, {
                name: 'Customer 1',
                phone: '08123456789',
            });

            await expect(service.createCustomer(outlet.id, {
                name: 'Customer 2',
                phone: '08123456789',
            })).rejects.toThrow('Nomor telepon sudah terdaftar');
        });

        it('should allow same phone number in different outlets', async () => {
            const outlet1 = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-cust-outlet1' }),
            });

            const outlet2 = await prisma.outlet.create({
                data: createOutletData({ slug: 'test-cust-outlet2' }),
            });

            await service.createCustomer(outlet1.id, {
                name: 'Customer 1',
                phone: '08123456789',
            });

            const result = await service.createCustomer(outlet2.id, {
                name: 'Customer 2',
                phone: '08123456789',
            });

            expect(result.outletId).toBe(outlet2.id);
        });
    });

    describe('listCustomers', () => {
        it('should list customers filtered by outlet', async () => {
            const outlet1 = await prisma.outlet.create({
                data: createOutletData({ slug: 'list-outlet-1' }),
            });
            const outlet2 = await prisma.outlet.create({
                data: createOutletData({ slug: 'list-outlet-2' }),
            });

            await service.createCustomer(outlet1.id, { name: 'C1 Outlet 1' });
            await service.createCustomer(outlet1.id, { name: 'C2 Outlet 1' });
            await service.createCustomer(outlet2.id, { name: 'C1 Outlet 2' });

            const list1 = await service.listCustomers(outlet1.id, {});
            expect(list1.customers).toHaveLength(2);
            expect(list1.total).toBe(2);

            const list2 = await service.listCustomers(outlet2.id, {});
            expect(list2.customers).toHaveLength(1);
        });
    });

    describe('updateCustomer', () => {
        it('should update customer details', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'update-outlet' }),
            });

            const customer = await service.createCustomer(outlet.id, {
                name: 'Old Name',
                phone: '08111111',
            });

            const updated = await service.updateCustomer(outlet.id, customer.id, {
                name: 'New Name',
                phone: '08222222',
            });

            expect(updated.name).toBe('New Name');
            expect(updated.phone).toBe('08222222');
        });

        it('should fail updating if phone duplicate exists', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'update-dup-outlet' }),
            });

            await service.createCustomer(outlet.id, {
                name: 'Customer A',
                phone: '08111111',
            });

            const customerB = await service.createCustomer(outlet.id, {
                name: 'Customer B',
                phone: '08222222',
            });

            await expect(service.updateCustomer(outlet.id, customerB.id, {
                phone: '08111111',
            })).rejects.toThrow('Nomor telepon sudah terdaftar');
        });
    });

    describe('deleteCustomer', () => {
        it('should delete customer', async () => {
            const outlet = await prisma.outlet.create({
                data: createOutletData({ slug: 'delete-outlet' }),
            });

            const customer = await service.createCustomer(outlet.id, {
                name: 'To Delete',
            });

            await service.deleteCustomer(outlet.id, customer.id);

            const found = await service.getCustomer(outlet.id, customer.id);
            expect(found).toBeNull();
        });
    });
});
