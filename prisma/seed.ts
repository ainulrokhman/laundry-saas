/**
 * Prisma Seed Script
 * 
 * Seed database dengan data awal (mode demo):
 * - SUPERADMIN user
 * - Outlets + OWNER multi-outlet (via Outlet.ownerId) + STAFF single-outlet
 * - Services + bank accounts per outlet
 * - (Opsional) Sample orders + transactions
 *
 * Catatan penting:
 * - Script ini dibuat **idempotent** untuk data demo (berdasarkan slug outlet + phone user).
 * - Untuk production, gunakan prefix (`SEED_PREFIX`) agar tidak bentrok dengan data nyata.
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

function envFlag(name: string): boolean {
  const v = String(process.env[name] ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

function envString(name: string, fallback?: string): string {
  const v = String(process.env[name] ?? '').trim();
  return v.length > 0 ? v : (fallback ?? '');
}

function envCsv(name: string): string[] {
  const v = String(process.env[name] ?? '').trim();
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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
  console.log('🌱 Memulai seed database...\n');

  // Default PIN: 123456 (hashed)
  const defaultPin = await bcrypt.hash('123456', 10);

  // ============================================
  // 0. Seed configuration (via env)
  // ============================================
  const seedPrefix = envString('SEED_PREFIX', 'demo');
  const includeTransactions = envFlag('SEED_INCLUDE_TRANSACTIONS'); // include orders + transactions
  const allowProdSeed = envFlag('ALLOW_PROD_SEED');
  const useDemoPhones = envFlag('SEED_USE_DEMO_PHONES');

  const demoOwnerPhonesDefault = ['6281111111111', '6282222222222']; // 2 owner demo
  const demoStaffPhonesDefault = [
    '6284444444444', '6285555555555',
    '6286666666666', '6287777777777',
    '6288888888888', '6289999999999',
  ]; // 6 staff demo (2 per outlet)

  const ownerPhones = envCsv('SEED_OWNER_PHONES');
  const staffPhonesFlat = envCsv('SEED_STAFF_PHONES');

  const resolvedOwnerPhones = ownerPhones.length > 0 ? ownerPhones : demoOwnerPhonesDefault;
  const resolvedStaffPhones = staffPhonesFlat.length > 0 ? staffPhonesFlat : demoStaffPhonesDefault;

  if (includeTransactions && !allowProdSeed) {
    throw new Error(
      'Seed demo dengan orders/transactions diblokir untuk keamanan.\n' +
        'Set ALLOW_PROD_SEED=1 jika Anda benar-benar ingin membuat data demo (termasuk orders/transactions).'
    );
  }

  if (resolvedOwnerPhones === demoOwnerPhonesDefault && !useDemoPhones) {
    throw new Error(
      'Seed demo menggunakan default phone diblokir untuk keamanan.\n' +
        'Set SEED_USE_DEMO_PHONES=1 atau set SEED_OWNER_PHONES/SEED_STAFF_PHONES sendiri.'
    );
  }

  if (resolvedOwnerPhones.length < 2) {
    throw new Error('SEED_OWNER_PHONES harus berisi minimal 2 nomor (untuk 2 OWNER demo).');
  }
  if (resolvedStaffPhones.length < 6) {
    throw new Error('SEED_STAFF_PHONES harus berisi minimal 6 nomor (2 STAFF per 3 outlet demo).');
  }

  const superAdminPhone = envString('SEED_SUPERADMIN_PHONE', '6281234567890');
  const superAdminName = envString('SEED_SUPERADMIN_NAME', 'Super Admin');

  const buildSlug = (baseSlug: string) => (seedPrefix ? `${seedPrefix}-${baseSlug}` : baseSlug);
  const buildOutletName = (baseName: string) => (seedPrefix ? `${baseName} (${seedPrefix.toUpperCase()})` : baseName);

  // ============================================
  // 1. Create SuperAdmin user
  // ============================================
  console.log('📦 Creating SuperAdmin...');
  const superAdmin = await prisma.user.upsert({
    where: { phone: superAdminPhone },
    update: {},
    create: {
      phone: superAdminPhone,
      name: superAdminName,
      pin: defaultPin,
      role: Role.SUPERADMIN,
      isActive: true,
      isPinSet: true,
      pinChangedAt: new Date(),
    },
  });
  console.log(`   ✅ ${superAdmin.name} (${superAdmin.phone})\n`);

  // ============================================
  // 2. Backfill ownerId untuk data legacy (single-outlet OWNER)
  // ============================================
  console.log('🧩 Backfill Outlet.ownerId (legacy → model baru)...');
  const outletsNeedingOwner = await prisma.outlet.findMany({
    where: { ownerId: null },
    select: { id: true, slug: true },
  });

  let backfillCount = 0;
  for (const outlet of outletsNeedingOwner) {
    const legacyOwner = await prisma.user.findFirst({
      where: { role: Role.OWNER, outletId: outlet.id },
      select: { id: true, phone: true },
    });
    if (!legacyOwner) continue;

    await prisma.outlet.update({
      where: { id: outlet.id },
      data: { ownerId: legacyOwner.id },
    });
    backfillCount++;
  }
  console.log(`   ✅ Backfill selesai: ${backfillCount} outlet terisi ownerId\n`);

  // ============================================
  // 3. Create Demo Owners (multi-outlet)
  // ============================================
  console.log('👥 Creating Users (Owners & Staff)...');
  const users = [];
  const demoOwnerA = await prisma.user.upsert({
    where: { phone: resolvedOwnerPhones[0] },
    update: { role: Role.OWNER, isActive: true },
    create: {
      phone: resolvedOwnerPhones[0],
      name: `Owner A (${seedPrefix.toUpperCase()})`,
      pin: defaultPin,
      role: Role.OWNER,
      outletId: null, // akan diisi setelah outlet dibuat (outlet aktif)
      isActive: true,
      isPinSet: true,
      pinChangedAt: new Date(),
    },
  });
  users.push(demoOwnerA);
  console.log(`   ✅ OWNER A: ${demoOwnerA.name} (${demoOwnerA.phone})`);

  const demoOwnerB = await prisma.user.upsert({
    where: { phone: resolvedOwnerPhones[1] },
    update: { role: Role.OWNER, isActive: true },
    create: {
      phone: resolvedOwnerPhones[1],
      name: `Owner B (${seedPrefix.toUpperCase()})`,
      pin: defaultPin,
      role: Role.OWNER,
      outletId: null,
      isActive: true,
      isPinSet: true,
      pinChangedAt: new Date(),
    },
  });
  users.push(demoOwnerB);
  console.log(`   ✅ OWNER B: ${demoOwnerB.name} (${demoOwnerB.phone})\n`);

  // ============================================
  // 4. Create Demo Outlets (with ownerId)
  // ============================================
  console.log('🏪 Creating Outlets (demo)...');
  const outlets = [
    {
      name: buildOutletName('Laundry Express Jakarta'),
      slug: buildSlug('laundry-express-jakarta'),
      address: 'Jl. Sudirman No. 123, Jakarta Pusat',
      isPro: true,
      ownerId: demoOwnerA.id, // OwnerA owns outlet 1
    },
    {
      name: buildOutletName('Clean & Fresh Laundry'),
      slug: buildSlug('clean-fresh-laundry'),
      address: 'Jl. Thamrin No. 456, Jakarta Selatan',
      isPro: false,
      ownerId: demoOwnerA.id, // OwnerA owns outlet 2 (multi-outlet)
    },
    {
      name: buildOutletName('Quick Wash Bandung'),
      slug: buildSlug('quick-wash-bandung'),
      address: 'Jl. Dago No. 789, Bandung',
      isPro: false,
      ownerId: demoOwnerB.id, // OwnerB owns outlet 3
    },
  ];

  const createdOutlets = [];
  for (const outletData of outlets) {
    const outlet = await prisma.outlet.upsert({
      where: { slug: outletData.slug },
      update: {
        name: outletData.name,
        address: outletData.address,
        isPro: outletData.isPro,
        ownerId: outletData.ownerId,
      },
      create: outletData,
    });
    createdOutlets.push(outlet);
    console.log(`   ✅ ${outlet.name} (${outlet.slug})`);
  }
  console.log('');

  // Set outlet aktif untuk OWNER demo (session outlet context)
  const firstOutletOwnerA = createdOutlets.find((o) => o.ownerId === demoOwnerA.id);
  const firstOutletOwnerB = createdOutlets.find((o) => o.ownerId === demoOwnerB.id);
  if (firstOutletOwnerA) {
    await prisma.user.update({
      where: { id: demoOwnerA.id },
      data: { outletId: firstOutletOwnerA.id },
    });
  }
  if (firstOutletOwnerB) {
    await prisma.user.update({
      where: { id: demoOwnerB.id },
      data: { outletId: firstOutletOwnerB.id },
    });
  }

  // Staff (2 staff per outlet)
  const staffPhones = [
    [resolvedStaffPhones[0], resolvedStaffPhones[1]],
    [resolvedStaffPhones[2], resolvedStaffPhones[3]],
    [resolvedStaffPhones[4], resolvedStaffPhones[5]],
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
  // 5. Create Services for each Outlet
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
  // 6. Create Bank Accounts for each Outlet
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
  // 7. Create Sample Orders (+ Transactions)
  // ============================================
  let orderCount = 0;
  let transactionCount = 0;

  if (!includeTransactions) {
    console.log('⏭️  Skip sample orders/transactions (SEED_INCLUDE_TRANSACTIONS tidak diaktifkan)\n');
  } else {
    console.log('📦 Creating Sample Orders...');
  const demoOutletIds = createdOutlets.map((o) => o.id);
  const existingDemoOrders = await prisma.order.count({
    where: { outletId: { in: demoOutletIds } },
  });

  if (existingDemoOrders > 0) {
    console.log(`   ⏭️  Demo orders sudah ada (${existingDemoOrders}). Skip membuat orders baru.`);
    orderCount = existingDemoOrders;
  } else {
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

  orderCount = 0;
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
  }

  // ============================================
  // 8. Create Sample Transactions
  // ============================================
  console.log('💳 Creating Sample Transactions...');
  
  // Get all orders with SETTLEMENT payment status
  const settledOrders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.SETTLEMENT,
      outletId: { in: demoOutletIds },
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

  transactionCount = 0;
  for (const order of settledOrders) {
    const existingTx = await prisma.transaction.findFirst({
      where: {
        type: TransType.LAUNDRY_ORDER,
        orderId: order.id,
      },
      select: { id: true },
    });
    if (existingTx) continue;

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
  }

  // ============================================
  // Summary
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SEED SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 Users:        ${users.length + 1} (1 SUPERADMIN, 2 OWNERS, ${users.length - 2} STAFF)`);
  console.log(`🏪 Outlets:      ${createdOutlets.length}`);
  console.log(`🛍️  Services:     ${serviceTemplates.length * createdOutlets.length} (${serviceTemplates.length} per outlet)`);
  console.log(`🏦 Bank Accounts: ${bankAccounts.length}`);
  console.log(`📦 Orders:       ${includeTransactions ? orderCount : 0}`);
  console.log(`💳 Transactions: ${includeTransactions ? transactionCount : 0}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Login Credentials:');
  console.log(`   • SUPERADMIN: ${superAdminPhone} / PIN: 123456`);
  console.log(`   • OWNER A: ${resolvedOwnerPhones[0]} / PIN: 123456 (memiliki 2 outlet demo)`);
  console.log(`   • OWNER B: ${resolvedOwnerPhones[1]} / PIN: 123456 (memiliki 1 outlet demo)`);
  for (let i = 0; i < createdOutlets.length; i++) {
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
