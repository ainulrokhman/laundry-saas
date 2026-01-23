/**
 * Copy AdminLTE Assets Script
 * 
 * Copies AdminLTE and Bootstrap JS files from node_modules to public folder.
 * Run this script after npm install to ensure JS files are available.
 */

const fs = require('fs');
const path = require('path');

const sourceFiles = [
  {
    from: path.join(__dirname, '../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js'),
    to: path.join(__dirname, '../public/js/bootstrap.bundle.min.js'),
  },
  {
    from: path.join(__dirname, '../node_modules/admin-lte/dist/js/adminlte.min.js'),
    to: path.join(__dirname, '../public/js/adminlte.min.js'),
  },
];

// Ensure public/js directory exists
const publicJsDir = path.join(__dirname, '../public/js');
if (!fs.existsSync(publicJsDir)) {
  fs.mkdirSync(publicJsDir, { recursive: true });
}

// Copy files
sourceFiles.forEach(({ from, to }) => {
  try {
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
      console.log(`✓ Copied ${path.basename(from)} to public/js/`);
    } else {
      console.warn(`⚠ File not found: ${from}`);
      console.warn(`  Make sure to run 'npm install' first`);
    }
  } catch (error) {
    console.error(`✗ Error copying ${path.basename(from)}:`, error.message);
  }
});

console.log('\n✓ AdminLTE assets copy completed!');
