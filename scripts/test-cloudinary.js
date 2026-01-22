/**
 * Test Cloudinary Configuration
 * Run this script to verify Cloudinary setup
 * 
 * Usage: node scripts/test-cloudinary.js
 */

require('dotenv').config({ path: '.env.local' });

const { v2: cloudinary } = require('cloudinary');

console.log('\n=== Cloudinary Configuration Test ===\n');

// Check environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('1. Environment Variables Check:');
console.log('   CLOUDINARY_CLOUD_NAME:', cloudName ? `✅ ${cloudName}` : '❌ Missing');
console.log('   CLOUDINARY_API_KEY:', apiKey ? `✅ ${apiKey.substring(0, 8)}...` : '❌ Missing');
console.log('   CLOUDINARY_API_SECRET:', apiSecret ? `✅ ${apiSecret.substring(0, 8)}...` : '❌ Missing');

if (!cloudName || !apiKey || !apiSecret) {
  console.log('\n❌ ERROR: Missing environment variables!');
  console.log('   Please check your .env.local file.\n');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log('\n2. Cloudinary Connection Test:');

// Test connection
cloudinary.api.ping()
  .then(result => {
    console.log('   ✅ Connection successful!');
    console.log('   Status:', result.status);
    
    console.log('\n3. Account Information:');
    // Get account info using admin API
    return cloudinary.api.usage();
  })
  .then(usage => {
    console.log('   ✅ Account verified!');
    console.log('   Cloud Name:', cloudName);
    console.log('   Plan:', usage.plan || 'Free');
    console.log('   Credits:', usage.credits || 'N/A');
    console.log('   Bandwidth Used:', usage.bandwidth ? `${(usage.bandwidth.used / 1024 / 1024).toFixed(2)} MB` : 'N/A');
    
    console.log('\n✅ All tests passed! Cloudinary is configured correctly.\n');
    process.exit(0);
  })
  .catch(error => {
    console.log('   ❌ Connection failed!');
    console.log('\n   Error Details:');
    console.log('   Message:', error.message);
    
    if (error.http_code === 401) {
      console.log('\n   💡 Solution: Check your API Key and API Secret');
      console.log('      - Login to https://cloudinary.com/console');
      console.log('      - Go to Settings > Security');
      console.log('      - Copy API Key and API Secret');
    } else if (error.http_code === 404) {
      console.log('\n   💡 Solution: Check your Cloud Name');
      console.log('      - Login to https://cloudinary.com/console');
      console.log('      - Check your Cloud Name in Account Details');
    } else {
      console.log('\n   💡 Solution:');
      console.log('      - Verify your credentials in .env.local');
      console.log('      - Make sure you restarted the dev server');
      console.log('      - Check your internet connection');
    }
    
    console.log('\n');
    process.exit(1);
  });
