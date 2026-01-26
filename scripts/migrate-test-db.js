/**
 * Script to sync Prisma schema to test database (db push)
 *
 * Kenapa db push (bukan migrate deploy)?
 * - Repo ini saat ini tidak menyimpan folder `prisma/migrations/`.
 * - Untuk TEST database, tujuan utama adalah schema selalu mengikuti `prisma/schema.prisma`.
 *
 * ⚠️ Jangan gunakan script ini untuk production.
 */

const { config } = require('dotenv');
const { resolve } = require('path');
const { execSync } = require('child_process');

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.error('❌ ERROR: TEST_DATABASE_URL is not set in .env.local');
  console.error('   Please set TEST_DATABASE_URL with your test database connection string.');
  process.exit(1);
}

console.log('🔄 Running migrations on test database...');
console.log(`   Database: ${testDbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

try {
  // Set DATABASE_URL to TEST_DATABASE_URL and run db push
  process.env.DATABASE_URL = testDbUrl;
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('\n✅ Test database schema synced successfully (db push)!');
} catch (error) {
  console.error('\n❌ DB push failed:', error.message);
  process.exit(1);
}
