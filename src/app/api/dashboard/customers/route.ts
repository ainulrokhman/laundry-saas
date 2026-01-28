
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { CustomerService } from '@/services/dashboard/CustomerService';
import { CustomerRepository } from '@/repositories/CustomerRepository';
import { CustomerDTO } from '@/dto/CustomerDTO';
import { Role } from '@/generated/prisma';
import { z } from 'zod';
import { sanitizeString, sanitizePhone, sanitizeEmail } from '@/lib/utils/sanitize';

const customerRepo = new CustomerRepository();
const customerService = new CustomerService(customerRepo);

const querySchema = z.object({
    search: z.string().optional(),
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
});

const createSchema = z.object({
    name: z.string().min(1, 'Nama wajib diisi'),
    phone: z.string().optional(),
    email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
    address: z.string().optional(),
});

export const GET = withAuth(
    async (request: Request, session: ExtendedSession) => {
        try {
            const url = new URL(request.url);
            const query = Object.fromEntries(url.searchParams.entries());
            const { search, page, limit } = querySchema.parse(query);

            const result = await customerService.listCustomers(session.outletId!, {
                search: search ? sanitizeString(search) : undefined,
                page,
                limit,
            });

            return Response.json({
                success: true,
                data: CustomerDTO.toResponseList(result.customers),
                meta: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            });
        } catch (error) {
            console.error('List customers error:', error);
            return Response.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : 'Gagal memuat daftar pelanggan',
                },
                { status: 500 }
            );
        }
    },
    {
        roles: [Role.OWNER, Role.STAFF],
        requireOutlet: true,
    }
);

export const POST = withAuth(
    async (request: Request, session: ExtendedSession) => {
        try {
            const body = await request.json();
            const parsed = createSchema.parse(body);

            // Sanitize inputs
            const sanitizedData = {
                name: sanitizeString(parsed.name),
                phone: parsed.phone ? sanitizePhone(parsed.phone) : undefined,
                email: parsed.email ? sanitizeEmail(parsed.email) : undefined,
                address: parsed.address ? sanitizeString(parsed.address) : undefined,
            };

            const customer = await customerService.createCustomer(session.outletId!, sanitizedData);

            return Response.json({
                success: true,
                data: CustomerDTO.toResponse(customer),
                message: 'Pelanggan berhasil ditambahkan',
            });
        } catch (error) {
            console.error('Create customer error:', error);

            // Handle Zod validation errors
            if (error instanceof z.ZodError) {
                return Response.json(
                    {
                        success: false,
                        error: (error as z.ZodError).errors[0]?.message || 'Validation error',
                    },
                    { status: 400 }
                );
            }

            return Response.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : 'Gagal menambahkan pelanggan',
                },
                { status: 500 }
            );
        }
    },
    {
        roles: [Role.OWNER, Role.STAFF],
        requireOutlet: true,
    }
);
