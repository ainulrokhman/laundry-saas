/**
 * Patches Font Awesome all.min.css to use font-display: swap instead of block.
 * Run after patch-package in postinstall so that the bundled CSS used by the app has swap.
 */
const fs = require('fs');
const path = require('path');

const cssPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@fortawesome',
  'fontawesome-free',
  'css',
  'all.min.css'
);

if (!fs.existsSync(cssPath)) {
  process.exit(0);
}

let css = fs.readFileSync(cssPath, 'utf8');
const updated = css.replace(/font-display:block/g, 'font-display:swap');
if (updated !== css) {
  fs.writeFileSync(cssPath, updated);
}
