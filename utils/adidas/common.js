import fs from 'fs';
import path from 'path';

// 从文件名中提取时间戳
export function extractTimestampFromFilename(filename) {
	// 文件名格式: adidas-extra-sale-products_2025-10-05_07-41-45.json
	// 支持 .json 扩展名
	// 匹配格式: adidas-extra-sale-products_yyyy-mm-dd_hh-mm-ss.json
	let match = filename.match(/adidas[_-]extra[_-]sale[_-]products_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.json/);
	if (match) {
		// 格式: 2025-10-05_07-41-45，转换为标准时间格式
		const dateStr = match[1];
		const timeStr = `${match[2]}:${match[3]}:${match[4]}`;
		return new Date(`${dateStr}T${timeStr}`);
	}

	console.log('无法匹配文件名格式:', filename);
	return null;
}

// 查找最新的两个HTML文件
/**
 * @excludeFileName {string|null} 排除的文件名（不包括扩展名）
 * @returns {string|null} 返回最新的文件名字.json，或null如果没有找到 'adidas-extra-sale-products_2025-10-16_23-06-51.json'
 */
export function findPreviousJSONFile(excludeFileName = null) {
	// 从项目根目录(当前工作目录)查找 collection 文件夹
	const collectionDir = path.resolve(process.cwd(), 'collection');

	if (!fs.existsSync(collectionDir)) {
		console.log('Collection目录不存在，正在创建...');
		fs.mkdirSync(collectionDir, { recursive: true });
	}
	console.log('正在查找最新的JSON文件...');

	const excludeBasename = excludeFileName ? `${path.basename(excludeFileName)}.json` : null;

	const files = fs
		.readdirSync(collectionDir)
		.filter((f) => f.includes('adidas') && f.includes('extra') && f.includes('sale') && f.endsWith('.json') && f !== excludeBasename)
		.map((f) => {
			const timestamp = extractTimestampFromFilename(f);
			return {
				name: f,
				timestamp: timestamp,
			};
		})
		.filter((f) => {
			if (f.timestamp) {
				console.log(`文件: ${f.name}, 时间: ${f.timestamp.toISOString()}`);
				return true;
			} else {
				console.log(`跳过无效时间戳的文件: ${f.name}`);
				return false;
			}
		})
		.sort((a, b) => b.timestamp - a.timestamp); // 按时间降序排列，最新的在前

	if (files.length >= 1) {
		console.log(`找到上一个收集的文件: ${files[0]}`);
		return files[0].name;
	} else {
		console.log('没有找到任何文件，这应该是第一次运行');
		return null;
	}
}

export function getFilePath(fileName, extension = 'json') {
	const collectionFolder = path.resolve(process.cwd(), 'collection');
	if (!fs.existsSync(collectionFolder)) {
		fs.mkdirSync(collectionFolder);
	}
	return path.resolve(collectionFolder, fileName + '.' + extension);
}
