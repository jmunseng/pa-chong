import { findPreviousJSONFile } from '../../utils/adidas/adidas.js';

// 模拟当前文件名（不包含扩展名，但包含 collection/ 前缀）
const currentFileName = 'collection/adidas-extra-sale-products_2025-11-04_23-15-33';

console.log('当前文件名:', currentFileName);
console.log('查找之前的文件...\n');

const prevFileName = findPreviousJSONFile(currentFileName);

console.log('\n结果:');
console.log('prevFileName:', prevFileName);

if (prevFileName) {
	console.log('✅ 找到了之前的文件');
} else {
	console.log('❌ 未找到之前的文件');
}
