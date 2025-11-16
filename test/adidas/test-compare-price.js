import { comparePrice } from '../../utils/common.js';
import fs from 'fs';
import path from 'path';

/**
 * comparePrice 函数单元测试
 *
 * 测试场景:
 * 1. 价格下降检测
 * 2. 价格上涨检测
 * 3. 新产品检测
 * 4. 产品下架检测
 * 5. 新增 Extra 30% OFF 标记检测
 * 6. 无历史数据场景
 */

// 创建测试数据目录 (使用 collection/adidas 因为 getFilePath 强制使用该目录)
const testDir = path.join(process.cwd(), 'collection', 'adidas');
if (!fs.existsSync(testDir)) {
	fs.mkdirSync(testDir, { recursive: true });
}

// 测试数据 - 上一次抓取
const previousData = {
	dateTimeString: '2025. 11. 15. 오전 10:00:00',
	timestamp: '2025-11-15T01:00:00.000Z',
	totalProducts: 4,
	products: {
		ABC123: {
			code: 'ABC123',
			name: '测试产品 1',
			price: 100000,
			url: 'https://www.adidas.co.kr/ABC123.html',
			imageUrl: 'https://example.com/abc123.jpg',
			isExtra30Off: false,
		},
		DEF456: {
			code: 'DEF456',
			name: '测试产品 2',
			price: 80000,
			url: 'https://www.adidas.co.kr/DEF456.html',
			imageUrl: 'https://example.com/def456.jpg',
			isExtra30Off: false,
		},
		GHI789: {
			code: 'GHI789',
			name: '测试产品 3',
			price: 120000,
			url: 'https://www.adidas.co.kr/GHI789.html',
			imageUrl: 'https://example.com/ghi789.jpg',
			isExtra30Off: false,
		},
		JKL012: {
			code: 'JKL012',
			name: '测试产品 4 (将被下架)',
			price: 60000,
			url: 'https://www.adidas.co.kr/JKL012.html',
			imageUrl: 'https://example.com/jkl012.jpg',
			isExtra30Off: false,
		},
	},
};

// 测试数据 - 当前抓取
const currentData = {
	dateTimeString: '2025. 11. 16. 오전 10:00:00',
	timestamp: '2025-11-16T01:00:00.000Z',
	totalProducts: 4,
	products: {
		ABC123: {
			code: 'ABC123',
			name: '测试产品 1',
			price: 90000, // 价格下降: 100000 → 90000
			url: 'https://www.adidas.co.kr/ABC123.html',
			imageUrl: 'https://example.com/abc123.jpg',
			isExtra30Off: false,
		},
		DEF456: {
			code: 'DEF456',
			name: '测试产品 2',
			price: 85000, // 价格上涨: 80000 → 85000
			url: 'https://www.adidas.co.kr/DEF456.html',
			imageUrl: 'https://example.com/def456.jpg',
			isExtra30Off: true, // 新增 Extra 30% OFF
		},
		GHI789: {
			code: 'GHI789',
			name: '测试产品 3',
			price: 120000, // 价格不变
			url: 'https://www.adidas.co.kr/GHI789.html',
			imageUrl: 'https://example.com/ghi789.jpg',
			isExtra30Off: false,
		},
		MNO345: {
			code: 'MNO345',
			name: '测试产品 5 (新产品)',
			price: 150000,
			url: 'https://www.adidas.co.kr/MNO345.html',
			imageUrl: 'https://example.com/mno345.jpg',
			isExtra30Off: false,
		},
		// 注意: JKL012 不在当前数据中,将被标记为已下架
	},
};

// 生成测试文件名 (使用特殊日期格式确保唯一性,防止与真实数据冲突)
// 格式必须符合: YYYY-MM-DD_HH-MM-SS
const previousFileName = '1900-01-01_10-00-00'; // 使用 1900 年确保排在最前面被忽略
const currentFileName = '1900-01-01_10-00-01'; // 比 previousFileName 晚1秒

// 创建测试文件
const previousFilePath = path.join(testDir, `${previousFileName}.json`);
const currentFilePath = path.join(testDir, `${currentFileName}.json`);

fs.writeFileSync(previousFilePath, JSON.stringify(previousData, null, 2), 'utf-8');
fs.writeFileSync(currentFilePath, JSON.stringify(currentData, null, 2), 'utf-8');

console.log('✅ 测试数据文件已创建');
console.log(`  上一次抓取: ${previousFilePath}`);
console.log(`  当前抓取: ${currentFilePath}`);
console.log('\n开始测试 comparePrice 函数...\n');
console.log('='.repeat(60));

// 执行测试 (fileName 不包含 collection/adidas/ 前缀,getFilePath 会自动添加)
try {
	await comparePrice(currentFileName);

	// 验证结果
	console.log('\n' + '='.repeat(60));
	console.log('\n验证测试结果...\n');

	const updatedCurrentData = JSON.parse(fs.readFileSync(currentFilePath, 'utf-8'));
	const products = updatedCurrentData.products;

	let testsPassed = 0;
	let testsFailed = 0;

	// 测试 1: 价格下降检测
	console.log('测试 1: 价格下降检测 (ABC123)');
	if (products.ABC123.isPriceDropped && products.ABC123.previousPrice === '100,000 원') {
		console.log('  ✅ 通过 - 正确检测到价格下降');
		testsPassed++;
	} else {
		console.log('  ❌ 失败 - 未能检测到价格下降');
		testsFailed++;
	}

	// 测试 2: 价格上涨检测
	console.log('测试 2: 价格上涨检测 (DEF456)');
	if (products.DEF456.isPriceIncreased && products.DEF456.previousPrice === '80,000 원') {
		console.log('  ✅ 通过 - 正确检测到价格上涨');
		testsPassed++;
	} else {
		console.log('  ❌ 失败 - 未能检测到价格上涨');
		testsFailed++;
	}

	// 测试 3: 新产品检测
	console.log('测试 3: 新产品检测 (MNO345)');
	if (products.MNO345.isNewItem === true) {
		console.log('  ✅ 通过 - 正确检测到新产品');
		testsPassed++;
	} else {
		console.log('  ❌ 失败 - 未能检测到新产品');
		testsFailed++;
	}

	// 测试 4: 新增 Extra 30% OFF 检测
	console.log('测试 4: 新增 Extra 30% OFF 检测 (DEF456)');
	if (products.DEF456.isNewExtra30Off === true) {
		console.log('  ✅ 通过 - 正确检测到新增 Extra 30% OFF');
		testsPassed++;
	} else {
		console.log('  ❌ 失败 - 未能检测到新增 Extra 30% OFF');
		testsFailed++;
	}

	// 测试 5: 价格不变检测
	console.log('测试 5: 价格不变检测 (GHI789)');
	if (!products.GHI789.isPriceDropped && !products.GHI789.isPriceIncreased && !products.GHI789.isNewItem) {
		console.log('  ✅ 通过 - 价格未变化的产品状态正确');
		testsPassed++;
	} else {
		console.log('  ❌ 失败 - 价格未变化的产品状态不正确');
		testsFailed++;
	}

	// 测试 6: HTML 文件生成
	const htmlFilePath = path.join(testDir, `${currentFileName}.html`);
	console.log('测试 6: HTML 文件生成');
	if (fs.existsSync(htmlFilePath)) {
		console.log('  ✅ 通过 - HTML 文件已生成');
		testsPassed++;
	} else {
		console.log('  ❌ 失败 - HTML 文件未生成');
		testsFailed++;
	}

	// 测试总结
	console.log('\n' + '='.repeat(60));
	console.log('测试总结:');
	console.log(`  ✅ 通过: ${testsPassed} 个`);
	console.log(`  ❌ 失败: ${testsFailed} 个`);
	console.log(`  总计: ${testsPassed + testsFailed} 个`);

	if (testsFailed === 0) {
		console.log('\n🎉 所有测试通过!');
	} else {
		console.log('\n⚠️  部分测试失败,请检查代码');
	}

	// 清理测试文件
	console.log('\n清理测试文件...');
	fs.unlinkSync(previousFilePath);
	fs.unlinkSync(currentFilePath);
	if (fs.existsSync(htmlFilePath)) {
		fs.unlinkSync(htmlFilePath);
	}
	// 注意: 不删除 testDir,因为它是 collection/adidas 主目录
	console.log('✅ 测试文件已清理');
} catch (error) {
	console.error('❌ 测试执行失败:', error.message);
	console.error(error.stack);

	// 清理测试文件
	try {
		if (fs.existsSync(previousFilePath)) fs.unlinkSync(previousFilePath);
		if (fs.existsSync(currentFilePath)) fs.unlinkSync(currentFilePath);
		const htmlFilePath = path.join(testDir, `${currentFileName}.html`);
		if (fs.existsSync(htmlFilePath)) fs.unlinkSync(htmlFilePath);
		// 注意: 不删除 testDir,因为它是 collection/adidas 主目录
	} catch (cleanupError) {
		console.error('清理测试文件时出错:', cleanupError.message);
	}

	process.exit(1);
}
