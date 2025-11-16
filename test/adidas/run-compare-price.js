#!/usr/bin/env node
import { comparePrice } from '../../utils/common.js';

// 从命令行参数获取文件名
const fileName = process.argv[2];

if (!fileName) {
	console.error('错误: 请提供文件名参数');
	console.log('\n用法:');
	console.log('  node run-compare-price.js <fileName>');
	console.log('\n示例:');
	console.log('  node run-compare-price.js 2025-11-16_21-52-34');
	process.exit(1);
}

console.log(`正在运行 comparePrice('${fileName}')...\n`);

try {
	await comparePrice(fileName);
	console.log('\n✅ 价格比较完成!');
} catch (error) {
	console.error('\n❌ 执行失败:', error.message);
	console.error(error.stack);
	process.exit(1);
}
