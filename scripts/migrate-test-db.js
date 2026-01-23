/**
 * Script to run Prisma migrations on test database
 * Reads TEST_DATABASE_URL from .env.local and runs migrations
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
  // Set DATABASE_URL to TEST_DATABASE_URL and run migrate deploy
  process.env.DATABASE_URL = testDbUrl;
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('\n✅ Test database migrations completed successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}
