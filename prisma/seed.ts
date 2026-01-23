/**
 * Prisma Seed Script
 * 
 * Seeds the database with comprehensive initial data:
 * - SuperAdmin user
 * - Multiple outlets with owners and staff
 * - Services for each outlet
 * - Bank accounts for each outlet
 * - Sample orders with various statuses
 * - Sample transactions
 * 
 * Run with: npm run prisma:seed
 */

// Load environment variables from .env.local (fallback if not loaded by dotenv-cli)
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient, Role, OrderStatus, PaymentStatus, PaymentMethod, TransType } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Generate random tracking code
 */
function generateTrackingCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Generate random date within last N days
 */
function randomDate(daysAgo: number = 7): Date {
  const now = new Date();
  const days = Math.floor(Math.random() * daysAgo);
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // Default PIN: 123456 (hashed)
  const defaultPin = await bcrypt.hash('123456', 10);

  // ============================================
  // 1. Create SuperAdmin user
  // ============================================
  console.log('📦 Creating SuperAdmin...');
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
  console.log(`   ✅ ${superAdmin.name} (${superAdmin.phone})\n`);

  // ============================================
  // 2. Create Multiple Outlets
  // ============================================
  console.log('🏪 Creating Outlets...');
  const outlets = [
    {
      name: 'Laundry Express Jakarta',
      slug: 'laundry-express-jakarta',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      isPro: true,
    },
    {
      name: 'Clean & Fresh Laundry',
      slug: 'clean-fresh-laundry',
      address: 'Jl. Thamrin No. 456, Jakarta Selatan',
      isPro: false,
    },
    {
      name: 'Quick Wash Bandung',
      slug: 'quick-wash-bandung',
      address: 'Jl. Dago No. 789, Bandung',
      isPro: false,
    },
  ];

  const createdOutlets = [];
  for (const outletData of outlets) {
    const outlet = await prisma.outlet.upsert({
      where: { slug: outletData.slug },
      update: {},
      create: outletData,
    });
    createdOutlets.push(outlet);
    console.log(`   ✅ ${outlet.name} (${outlet.slug})`);
  }
  console.log('');

  // ============================================
  // 3. Create Owners and Staff for each Outlet
  // ============================================
  console.log('👥 Creating Users (Owners & Staff)...');
  const users = [];
  
  // Owners
  const ownerPhones = ['6281111111111', '6282222222222', '6283333333333'];
  for (let i = 0; i < createdOutlets.length; i++) {
    const owner = await prisma.user.upsert({
      where: { phone: ownerPhones[i] },
      update: { outletId: createdOutlets[i].id },
      create: {
        phone: ownerPhones[i],
        name: `Owner ${createdOutlets[i].name}`,
        pin: defaultPin,
        role: Role.OWNER,
        outletId: createdOutlets[i].id,
        isActive: true,
        isPinSet: true,
        pinChangedAt: new Date(),
      },
    });
    users.push(owner);
    console.log(`   ✅ OWNER: ${owner.name} (${owner.phone}) - ${createdOutlets[i].name}`);
  }

  // Staff (2 staff per outlet)
  const staffPhones = [
    ['6284444444444', '6285555555555'],
    ['6286666666666', '6287777777777'],
    ['6288888888888', '6289999999999'],
  ];
  
  for (let i = 0; i < createdOutlets.length; i++) {
    for (let j = 0; j < 2; j++) {
      const staff = await prisma.user.upsert({
        where: { phone: staffPhones[i][j] },
        update: { outletId: createdOutlets[i].id },
        create: {
          phone: staffPhones[i][j],
          name: `Staff ${j + 1} ${createdOutlets[i].name}`,
          pin: defaultPin,
          role: Role.STAFF,
          outletId: createdOutlets[i].id,
          isActive: true,
          isPinSet: true,
          pinChangedAt: new Date(),
        },
      });
      users.push(staff);
      console.log(`   ✅ STAFF: ${staff.name} (${staff.phone}) - ${createdOutlets[i].name}`);
    }
  }
  console.log('');

  // ============================================
  // 4. Create Services for each Outlet
  // ============================================
  console.log('🛍️  Creating Services...');
  const serviceTemplates = [
    { name: 'Cuci Kiloan', type: 'KILOAN', price: 8000, unit: 'kg', description: 'Cuci kiloan per kilogram' },
    { name: 'Cuci Setrika Kiloan', type: 'KILOAN', price: 12000, unit: 'kg', description: 'Cuci dan setrika per kilogram' },
    { name: 'Setrika Satuan', type: 'SATUAN', price: 5000, unit: 'pcs', description: 'Setrika per pcs' },
    { name: 'Dry Clean Jaket', type: 'SATUAN', price: 25000, unit: 'pcs', description: 'Dry clean untuk jaket' },
    { name: 'Paket Express 24 Jam', type: 'PAKET', price: 50000, unit: 'paket', description: 'Paket express selesai dalam 24 jam' },
    { name: 'Paket Reguler 3 Hari', type: 'PAKET', price: 35000, unit: 'paket', description: 'Paket reguler selesai dalam 3 hari' },
  ];

  for (const outlet of createdOutlets) {
    for (const serviceTemplate of serviceTemplates) {
      // Check if service already exists
      const existing = await prisma.service.findFirst({
        where: {
          outletId: outlet.id,
          name: serviceTemplate.name,
        },
      });

      if (!existing) {
        await prisma.service.create({
          data: {
            outletId: outlet.id,
            name: serviceTemplate.name,
            type: serviceTemplate.type,
            price: serviceTemplate.price,
            unit: serviceTemplate.unit,
            description: serviceTemplate.description,
            isActive: true,
          },
        });
      }
    }
    console.log(`   ✅ Created ${serviceTemplates.length} services for ${outlet.name}`);
  }
  console.log('');

  // ============================================
  // 5. Create Bank Accounts for each Outlet
  // ============================================
  console.log('🏦 Creating Bank Accounts...');
  const bankAccounts = [
    { bankName: 'BCA', accountName: 'Laundry Express', accountNumber: '1234567890' },
    { bankName: 'Mandiri', accountName: 'Laundry Express', accountNumber: '9876543210' },
    { bankName: 'BNI', accountName: 'Clean & Fresh', accountNumber: '5555555555' },
    { bankName: 'BCA', accountName: 'Quick Wash', accountNumber: '1111111111' },
  ];

  for (let i = 0; i < createdOutlets.length; i++) {
    // Check if bank account already exists
    const existing = await prisma.bankAccount.findFirst({
      where: {
        outletId: createdOutlets[i].id,
        bankName: bankAccounts[i].bankName,
        accountNumber: bankAccounts[i].accountNumber,
      },
    });

    if (!existing) {
      const bankAccount = await prisma.bankAccount.create({
        data: {
          outletId: createdOutlets[i].id,
          bankName: bankAccounts[i].bankName,
          accountName: bankAccounts[i].accountName,
          accountNumber: bankAccounts[i].accountNumber,
          isActive: true,
        },
      });
      console.log(`   ✅ ${bankAccount.bankName} - ${bankAccount.accountNumber} for ${createdOutlets[i].name}`);
    } else {
      console.log(`   ⏭️  ${bankAccounts[i].bankName} already exists for ${createdOutlets[i].name}`);
    }
  }
  console.log('');

  // ============================================
  // 6. Create Sample Orders
  // ============================================
  console.log('📦 Creating Sample Orders...');
  const customerNames = ['Budi Santoso', 'Siti Nurhaliza', 'Ahmad Dahlan', 'Dewi Sartika', 'Raden Ajeng Kartini'];
  const customerPhones = ['6281000000001', '6281000000002', '6281000000003', '6281000000004', '6281000000005'];
  
  const orderStatuses: OrderStatus[] = [
    OrderStatus.QUEUED,
    OrderStatus.WASHING,
    OrderStatus.DRYING,
    OrderStatus.IRONING,
    OrderStatus.READY,
    OrderStatus.TAKEN,
  ];

  const paymentStatuses: PaymentStatus[] = [
    PaymentStatus.UNPAID,
    PaymentStatus.PENDING,
    PaymentStatus.SETTLEMENT,
  ];

  const paymentMethods: PaymentMethod[] = [
    PaymentMethod.CASH,
    PaymentMethod.TRANSFER,
  ];

  let orderCount = 0;
  for (const outlet of createdOutlets) {
    // Create 10-15 orders per outlet
    const numOrders = 10 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < numOrders; i++) {
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      const paymentMethod = paymentStatus === PaymentStatus.SETTLEMENT 
        ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
        : null;
      
      const customerIndex = Math.floor(Math.random() * customerNames.length);
      const totalAmount = 20000 + Math.floor(Math.random() * 100000);
      const createdAt = randomDate(30); // Random date within last 30 days
      
      // Generate unique tracking code
      let trackingCode = generateTrackingCode();
      let exists = true;
      while (exists) {
        const existing = await prisma.order.findUnique({
          where: { trackingCode },
        });
        if (!existing) {
          exists = false;
        } else {
          trackingCode = generateTrackingCode();
        }
      }

      const order = await prisma.order.create({
        data: {
          trackingCode,
          status,
          paymentStatus,
          paymentMethod,
          totalAmount,
          outletId: outlet.id,
          customerName: customerNames[customerIndex],
          customerPhone: customerPhones[customerIndex],
          notes: i % 3 === 0 ? 'Catatan khusus untuk order ini' : null,
          createdAt,
          completedAt: status === OrderStatus.TAKEN ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        },
      });
      orderCount++;
    }
    console.log(`   ✅ Created ${numOrders} orders for ${outlet.name}`);
  }
  console.log(`   📊 Total orders created: ${orderCount}\n`);

  // ============================================
  // 7. Create Sample Transactions
  // ============================================
  console.log('💳 Creating Sample Transactions...');
  
  // Get all orders with SETTLEMENT payment status
  const settledOrders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.SETTLEMENT,
    },
    include: {
      outlet: {
        include: {
          bankAccounts: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
  });

  let transactionCount = 0;
  for (const order of settledOrders) {
    const bankAccount = order.outlet.bankAccounts[0];
    
    await prisma.transaction.create({
      data: {
        type: TransType.LAUNDRY_ORDER,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod || PaymentMethod.CASH,
        status: PaymentStatus.SETTLEMENT,
        orderId: order.id,
        outletId: order.outletId,
        bankAccountId: order.paymentMethod === PaymentMethod.TRANSFER && bankAccount 
          ? bankAccount.id 
          : null,
        settledAt: order.createdAt,
        createdAt: order.createdAt,
      },
    });
    transactionCount++;
  }
  console.log(`   ✅ Created ${transactionCount} transactions\n`);

  // ============================================
  // Summary
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SEED SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 Users:        ${users.length + 1} (1 SUPERADMIN, ${createdOutlets.length} OWNERS, ${users.length - createdOutlets.length} STAFF)`);
  console.log(`🏪 Outlets:      ${createdOutlets.length}`);
  console.log(`🛍️  Services:     ${serviceTemplates.length * createdOutlets.length} (${serviceTemplates.length} per outlet)`);
  console.log(`🏦 Bank Accounts: ${bankAccounts.length}`);
  console.log(`📦 Orders:       ${orderCount}`);
  console.log(`💳 Transactions: ${transactionCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Login Credentials:');
  console.log('   • SUPERADMIN: 6281234567890 / PIN: 123456');
  for (let i = 0; i < createdOutlets.length; i++) {
    console.log(`   • OWNER ${i + 1}: ${ownerPhones[i]} / PIN: 123456 (${createdOutlets[i].name})`);
    console.log(`   • STAFF ${i + 1}.1: ${staffPhones[i][0]} / PIN: 123456 (${createdOutlets[i].name})`);
    console.log(`   • STAFF ${i + 1}.2: ${staffPhones[i][1]} / PIN: 123456 (${createdOutlets[i].name})`);
  }
  console.log('\n⚠️  Please change the PIN after first login!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
