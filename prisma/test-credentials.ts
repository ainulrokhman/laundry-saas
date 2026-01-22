/**
 * Test Credentials Script
 * 
 * Script untuk test credentials setelah seed database
 * 
 * Run with: npm run db:test-credentials
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testCredentials() {
  console.log("🔐 Testing Credentials...\n");

  const testUsers = [
    {
      email: "superadmin@ainullaundry.com",
      password: "password123",
      expectedRole: "SUPERADMIN",
    },
    {
      email: "owner1@ainullaundry.com",
      password: "password123",
      expectedRole: "OWNER",
    },
    {
      email: "staff1@ainullaundry.com",
      password: "password123",
      expectedRole: "STAFF",
    },
    {
      email: "owner2@ainullaundry.com",
      password: "password123",
      expectedRole: "OWNER",
    },
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testUser of testUsers) {
    console.log(`Testing: ${testUser.email}`);
    console.log(`Expected Role: ${testUser.expectedRole}`);

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!user) {
        console.log(`❌ FAILED: User not found\n`);
        failedTests++;
        continue;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        testUser.password,
        user.password
      );

      if (!isPasswordValid) {
        console.log(`❌ FAILED: Invalid password\n`);
        failedTests++;
        continue;
      }

      // Verify role
      if (user.role !== testUser.expectedRole) {
        console.log(
          `❌ FAILED: Role mismatch. Expected: ${testUser.expectedRole}, Got: ${user.role}\n`
        );
        failedTests++;
        continue;
      }

      console.log(`✅ PASSED: Credentials valid`);
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Outlet: ${user.outlet.name} (${user.outlet.slug})`);
      console.log(`   - Password: Valid\n`);
      passedTests++;
    } catch (error) {
      console.log(`❌ FAILED: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      failedTests++;
    }
  }

  // Summary
  console.log("=".repeat(50));
  console.log("📊 Test Summary:");
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📝 Total: ${testUsers.length}`);
  console.log("=".repeat(50));

  if (failedTests === 0) {
    console.log("\n✨ All credentials are valid!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some credentials failed. Please check the seed data.");
    process.exit(1);
  }
}

testCredentials()
  .catch((e) => {
    console.error("❌ Error testing credentials:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
