/**
 * Copy AdminLTE Assets Script
 * 
 * Copies AdminLTE, Bootstrap JS files, and Bootstrap Icons fonts from node_modules to public folder.
 * Run this script after npm install to ensure JS files and fonts are available.
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

// Bootstrap Icons font files
const bootstrapIconsFonts = [
  {
    from: path.join(__dirname, '../node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff'),
    to: path.join(__dirname, '../public/fonts/bootstrap-icons.woff'),
  },
  {
    from: path.join(__dirname, '../node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff2'),
    to: path.join(__dirname, '../public/fonts/bootstrap-icons.woff2'),
  },
];

// Ensure directories exist
const publicJsDir = path.join(__dirname, '../public/js');
const publicFontsDir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(publicJsDir)) {
  fs.mkdirSync(publicJsDir, { recursive: true });
}
if (!fs.existsSync(publicFontsDir)) {
  fs.mkdirSync(publicFontsDir, { recursive: true });
}

// Copy JS files
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

// Copy Bootstrap Icons font files
bootstrapIconsFonts.forEach(({ from, to }) => {
  try {
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
      console.log(`✓ Copied ${path.basename(from)} to public/fonts/`);
    } else {
      console.warn(`⚠ Font file not found: ${from}`);
    }
  } catch (error) {
    console.error(`✗ Error copying ${path.basename(from)}:`, error.message);
  }
});

console.log('\n✓ AdminLTE assets copy completed!');
