import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the latest collection file and check the isExtra30Off property
function analyzeLatestFile() {
	const collectionDir = path.join(__dirname, 'collection');
	const files = fs
		.readdirSync(collectionDir)
		.filter((f) => f.includes('adidas') && f.includes('extra') && f.includes('sale') && f.endsWith('.html'))
		.sort((a, b) => {
			const aTime = fs.statSync(path.join(collectionDir, a)).mtime;
			const bTime = fs.statSync(path.join(collectionDir, b)).mtime;
			return bTime - aTime;
		});

	if (files.length === 0) {
		console.log('No files found');
		return;
	}

	const latestFile = path.join(collectionDir, files[0]);
	console.log('Analyzing file:', files[0]);

	const htmlContent = fs.readFileSync(latestFile, 'utf8');

	// Extract products from the table rows
	const rowRegex = /<div class="row(?:[^"]*)?">[\s\S]*?(?=<div class="row|<\/div>\s*<\/div>\s*$)/g;
	const rows = htmlContent.match(rowRegex) || [];

	console.log(`Found ${rows.length} rows`);

	let productCount = 0;

	rows.forEach((rowHtml, index) => {
		// Skip header row
		if (rowHtml.includes('class="row header"')) {
			return;
		}

		productCount++;

		// Extract product number from the first cell
		const numberMatch = rowHtml.match(/<div class="cell">(\d+)<\/div>/);
		const productNumber = numberMatch ? parseInt(numberMatch[1]) : productCount;

		// Extract product code
		const codeMatch = rowHtml.match(/<div class="cell"[^>]*onclick="copyCode\(this\)">([^<]+)<\/div>/);
		const code = codeMatch ? codeMatch[1].trim() : 'Unknown';

		// Extract product name
		const nameMatch = rowHtml.match(/<span class="product-name"[^>]*>([^<]+)/);
		const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

		// Check if has extra-30-badge
		const hasExtra30Badge = rowHtml.includes('extra-30-badge');

		// Show details for items around 13
		if (productNumber >= 10 && productNumber <= 16) {
			console.log(`\nProduct #${productNumber}: ${code} - ${name}`);
			console.log(`Has Extra 30% Badge: ${hasExtra30Badge}`);

			if (hasExtra30Badge) {
				const badgeMatch = rowHtml.match(/<div class="extra-30-badge">([^<]*)<\/div>/);
				console.log(`Badge content: ${badgeMatch ? badgeMatch[0] : 'Not found'}`);
			}
		}
	});

	console.log(`\nTotal products: ${productCount}`);
}

analyzeLatestFile();
