import fs from 'fs';

const latest = 'collection/adidas-extra-sale-products_2025-10-05_08:29:29.html';
let html = fs.readFileSync(latest, 'utf8');

// Find first occurrence of specific prices and modify them
html = html.replace(
	/(<div class="cell">IE3679<\/div>[\s\S]{1,200}?<div>\s*)55,300(\s*원)/,
	'$145,000$2'
);
html = html.replace(
	/(<div class="cell">IE3677<\/div>[\s\S]{1,200}?<div>\s*)62,300(\s*원)/,
	'$175,000$2'
);

// Save with future timestamp
fs.writeFileSync(
	'collection/adidas-extra-sale-products_2025-10-05_08:30:00.html',
	html
);
console.log('Created test file');
