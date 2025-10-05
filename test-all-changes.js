import fs from 'fs';

const latest = 'collection/adidas-extra-sale-products_2025-10-05_08:28:42.html';
const html = fs.readFileSync(latest, 'utf8');

// Extract some product codes to modify
const codeMatches = [...html.matchAll(/<div class="cell">([A-Z]{2}\d{4,})<\/div>/g)];
console.log('Found products:', codeMatches.slice(0, 5).map(m => m[1]));

// Create modified version with price changes
let modified = html;

// 1. Price DROP: IE3679 from current price to lower
modified = modified.replace(
  /(<div class="cell">IE3679<\/div>[\s\S]*?<div>\s*)(55,300)(\s*원)/,
  '$145,000$3'
);

// 2. Price INCREASE: IE3677 from current price to higher  
modified = modified.replace(
  /(<div class="cell">IE3677<\/div>[\s\S]*?<div>\s*)(62,300)(\s*원)/,
  '$175,000$3'
);

// 3. Remove one product (ID2704)
modified = modified.replace(
  /<div class="row[^"]*">[\s\S]*?<div class="cell">\d+<\/div>[\s\S]*?ID2704[\s\S]*?<\/div>\s*<\/div>/,
  ''
);

// Save as earlier timestamp
fs.writeFileSync('collection/adidas-extra-sale-products_2025-10-05_08:29:00.html', modified);
console.log('Created test file at 08:29:00 with:');
console.log('- IE3679: 55,300 → 45,000 (price drop)');
console.log('- IE3677: 62,300 → 75,000 (price increase)');  
console.log('- ID2704: removed');
