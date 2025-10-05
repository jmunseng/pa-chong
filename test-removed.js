import fs from 'fs';

// Read latest file
const latest = 'collection/adidas-extra-sale-products_2025-10-05_08:50:48.html';
let html = fs.readFileSync(latest, 'utf8');

// Remove products by filtering out specific rows
// Remove IE3679 (삼바 OG)
html = html.replace(/<div class="row">[\s\S]*?<div class="cell">1<\/div>[\s\S]*?IE3679[\s\S]*?<\/div>\s*<\/div>/, '');

// Save with future timestamp
fs.writeFileSync('collection/adidas-extra-sale-products_2025-10-05_08:54:00.html', html);
console.log('Created test file with IE3679 removed');
