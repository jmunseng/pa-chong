import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { comparePrice } from '../../utils/common.js';

const collectionDir = path.join(process.cwd(), 'collection', 'adidas');
const previousFileName = '2099-12-30_23-59-59';
const currentFileName = '2099-12-31_00-00-00';
const previousFilePath = path.join(collectionDir, `${previousFileName}.json`);
const currentFilePath = path.join(collectionDir, `${currentFileName}.json`);
const htmlFilePath = path.join(collectionDir, `${currentFileName}.html`);

const createProduct = (code, name, price, isExtra30Off = false) => ({
	code,
	name,
	price,
	url: `https://www.adidas.co.kr/${code}.html`,
	imageUrl: `https://cdn.example.com/${code}.jpg`,
	isExtra30Off,
});

const previousData = {
	dateTimeString: '2025-11-01 00:00:00',
	timestamp: '2025-11-01T00:00:00.000Z',
	hasError: false,
	totalProducts: 3,
	products: {
		AAA111: createProduct('AAA111', 'Alpha Runner', 120000),
		BBB222: createProduct('BBB222', 'Beta Trainer', 80000, true),
		CCC333: createProduct('CCC333', 'Gamma Slides', 90000),
	},
};

const currentData = {
	dateTimeString: '2025-11-02 00:00:00',
	timestamp: '2025-11-02T00:00:00.000Z',
	hasError: false,
	totalProducts: 3,
	products: {
		AAA111: createProduct('AAA111', 'Alpha Runner', 100000),
		BBB222: createProduct('BBB222', 'Beta Trainer', 120000, true),
		DDD444: createProduct('DDD444', 'Delta Booster', '70,000 원', true),
	},
};

const ensureDir = () => {
	if (!fs.existsSync(collectionDir)) {
		fs.mkdirSync(collectionDir, { recursive: true });
	}
};

const cleanup = () => {
	[previousFilePath, currentFilePath, htmlFilePath].forEach((target) => {
		if (fs.existsSync(target)) {
			fs.unlinkSync(target);
		}
	});
};

ensureDir();

const run = async () => {
	try {
		cleanup();

		fs.writeFileSync(previousFilePath, JSON.stringify(previousData, null, 2), 'utf-8');
		fs.writeFileSync(currentFilePath, JSON.stringify(currentData, null, 2), 'utf-8');

		await comparePrice(currentFileName);

		assert.ok(fs.existsSync(htmlFilePath), 'HTML 文件应被生成');
		const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

		assert.ok(htmlContent.includes('Alpha Runner'), '应包含降价产品名称');
		assert.ok(htmlContent.includes('降价!'), '应渲染降价徽章');
		assert.ok(htmlContent.includes('-20,000 원'), '应展示降价幅度');
		assert.ok(htmlContent.includes('涨价!'), '应渲染涨价徽章');
		assert.ok(htmlContent.includes('+40,000 원'), '应展示涨价幅度');
		assert.ok(htmlContent.includes('新产品!'), '应标记新产品');
		assert.ok(htmlContent.includes('New!</span>'), '应高亮新增的 Extra 30% OFF');
		assert.ok(htmlContent.includes('已下架产品 (1 件)'), '应输出下架产品统计');
		assert.ok(htmlContent.includes('CCC333'), '应列出下架产品编码');
		assert.ok(htmlContent.includes('上一次抓取时间: 2025-11-01 00:00:00'), '应展示上一轮抓取时间');
		assert.ok(htmlContent.includes('抓取时间: 2025-11-02 00:00:00'), '应展示当前抓取时间');

		console.log('✅ comparePrice HTML 生成逻辑测试通过');
	} catch (error) {
		console.error('❌ comparePrice 测试失败:', error);
		process.exitCode = 1;
	} finally {
		cleanup();
	}
};

await run();
