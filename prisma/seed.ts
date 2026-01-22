/**
 * Prisma Seed File
 * Seeds the database with initial data for testing
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTrackingCode } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("🧹 Cleaning existing data...");
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();

  // Create Outlets
  console.log("🏪 Creating outlets...");
  const outlet1 = await prisma.outlet.create({
    data: {
      name: "Ainul Laundry - Cabang Pusat",
      slug: "ainul-laundry-pusat",
      address: "Jl. Raya Sudirman No. 123, Jakarta Pusat",
      bankInfo: "BCA - 1234567890 a.n. Ainul Laundry",
      isPro: true,
    },
  });

  const outlet2 = await prisma.outlet.create({
    data: {
      name: "Ainul Laundry - Cabang Depok",
      slug: "ainul-laundry-depok",
      address: "Jl. Margonda Raya No. 456, Depok",
      bankInfo: "Mandiri - 9876543210 a.n. Ainul Laundry",
      isPro: false,
    },
  });

  console.log(`✅ Created outlet: ${outlet1.name} (${outlet1.id})`);
  console.log(`✅ Created outlet: ${outlet2.name} (${outlet2.id})`);

  // Create Users
  console.log("👥 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // SuperAdmin (no outlet required, but we'll assign to outlet1 for testing)
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@ainullaundry.com",
      name: "Super Admin",
      password: hashedPassword,
      role: "SUPERADMIN",
      outletId: outlet1.id,
    },
  });

  // Owner for outlet1
  const owner1 = await prisma.user.create({
    data: {
      email: "owner1@ainullaundry.com",
      name: "Owner Outlet Pusat",
      password: hashedPassword,
      role: "OWNER",
      outletId: outlet1.id,
    },
  });

  // Staff for outlet1
  const staff1 = await prisma.user.create({
    data: {
      email: "staff1@ainullaundry.com",
      name: "Staff Outlet Pusat",
      password: hashedPassword,
      role: "STAFF",
      outletId: outlet1.id,
    },
  });

  // Owner for outlet2
  const owner2 = await prisma.user.create({
    data: {
      email: "owner2@ainullaundry.com",
      name: "Owner Outlet Depok",
      password: hashedPassword,
      role: "OWNER",
      outletId: outlet2.id,
    },
  });

  console.log(`✅ Created user: ${superAdmin.email} (${superAdmin.role})`);
  console.log(`✅ Created user: ${owner1.email} (${owner1.role})`);
  console.log(`✅ Created user: ${staff1.email} (${staff1.role})`);
  console.log(`✅ Created user: ${owner2.email} (${owner2.role})`);

  // Create Services for outlet1
  console.log("🛍️ Creating services...");
  const services1 = await Promise.all([
    prisma.service.create({
      data: {
        name: "Cuci Kering (Kiloan)",
        type: "KILOAN",
        price: 8000,
        outletId: outlet1.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Cuci Setrika (Kiloan)",
        type: "KILOAN",
        price: 12000,
        outletId: outlet1.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Kemeja",
        type: "SATUAN",
        price: 15000,
        outletId: outlet1.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Celana",
        type: "SATUAN",
        price: 10000,
        outletId: outlet1.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Paket Express (5kg)",
        type: "PAKET",
        price: 50000,
        outletId: outlet1.id,
      },
    }),
  ]);

  // Create Services for outlet2
  const services2 = await Promise.all([
    prisma.service.create({
      data: {
        name: "Cuci Kering (Kiloan)",
        type: "KILOAN",
        price: 7500,
        outletId: outlet2.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Cuci Setrika (Kiloan)",
        type: "KILOAN",
        price: 11000,
        outletId: outlet2.id,
      },
    }),
  ]);

  console.log(`✅ Created ${services1.length} services for outlet1`);
  console.log(`✅ Created ${services2.length} services for outlet2`);

  // Create Orders for outlet1
  console.log("📦 Creating orders...");
  const order1 = await prisma.order.create({
    data: {
      trackingCode: generateTrackingCode(),
      status: "QUEUED",
      paymentStatus: "UNPAID",
      totalAmount: 24000, // 2kg x 12000
      outletId: outlet1.id,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      trackingCode: generateTrackingCode(),
      status: "WASHING",
      paymentStatus: "PENDING",
      totalAmount: 30000, // 2 kemeja x 15000
      outletId: outlet1.id,
    },
  });

  const order3 = await prisma.order.create({
    data: {
      trackingCode: generateTrackingCode(),
      status: "READY",
      paymentStatus: "SETTLEMENT",
      totalAmount: 50000, // Paket Express
      outletId: outlet1.id,
    },
  });

  // Create Orders for outlet2
  const order4 = await prisma.order.create({
    data: {
      trackingCode: generateTrackingCode(),
      status: "DRYING",
      paymentStatus: "SETTLEMENT",
      totalAmount: 22500, // 3kg x 7500
      outletId: outlet2.id,
    },
  });

  console.log(`✅ Created order: ${order1.trackingCode} (${order1.status})`);
  console.log(`✅ Created order: ${order2.trackingCode} (${order2.status})`);
  console.log(`✅ Created order: ${order3.trackingCode} (${order3.status})`);
  console.log(`✅ Created order: ${order4.trackingCode} (${order4.status})`);

  // Create Transactions
  console.log("💰 Creating transactions...");
  const transaction1 = await prisma.transaction.create({
    data: {
      type: "LAUNDRY_ORDER",
      amount: 30000,
      status: "PENDING",
      orderId: order2.id,
      outletId: outlet1.id,
    },
  });

  const transaction2 = await prisma.transaction.create({
    data: {
      type: "LAUNDRY_ORDER",
      amount: 50000,
      status: "SETTLEMENT",
      orderId: order3.id,
      outletId: outlet1.id,
    },
  });

  const transaction3 = await prisma.transaction.create({
    data: {
      type: "SUBSCRIPTION",
      amount: 100000,
      status: "SETTLEMENT",
      outletId: outlet1.id,
    },
  });

  console.log(`✅ Created transaction: ${transaction1.id} (${transaction1.type})`);
  console.log(`✅ Created transaction: ${transaction2.id} (${transaction2.type})`);
  console.log(`✅ Created transaction: ${transaction3.id} (${transaction3.type})`);

  console.log("\n✨ Seed completed successfully!");
  console.log("\n📝 Test Credentials:");
  console.log("  SuperAdmin: superadmin@ainullaundry.com / password123");
  console.log("  Owner 1: owner1@ainullaundry.com / password123");
  console.log("  Staff 1: staff1@ainullaundry.com / password123");
  console.log("  Owner 2: owner2@ainullaundry.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
