/**
 * Prisma Seed Script
 * 
 * Seeds the database with initial data:
 * - SuperAdmin user with default PIN (123456)
 * 
 * Run with: npm run prisma:seed
 */

// Load environment variables from .env.local (fallback if not loaded by dotenv-cli)
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient, Role } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Default PIN: 123456 (hashed)
  const defaultPin = await bcrypt.hash('123456', 10);

  // Create SuperAdmin user
  const superAdmin = await prisma.user.upsert({
    where: { phone: '6281234567890' },
    update: {},
    create: {
      phone: '6281234567890',
      name: 'Super Admin',
      pin: defaultPin,
      role: Role.SUPERADMIN,
      isActive: true,
      isPinSet: true,
      pinChangedAt: new Date(),
    },
  });

  console.log('✅ SuperAdmin user created:', {
    id: superAdmin.id,
    phone: superAdmin.phone,
    name: superAdmin.name,
    role: superAdmin.role,
  });

  console.log('📝 Default PIN for SuperAdmin: 123456');
  console.log('⚠️  Please change the PIN after first login!');

  console.log('✨ Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
