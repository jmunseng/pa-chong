import fs from 'fs';
import path from 'path';
import { generateAdidasHTMLContent } from './adidas/adidas-generate-html.js';
import { E_BrandSite } from '../src/enum/enum-brand-site.js';
import { E_BrandOption } from '../src/enum/enum-musinsa.js';
import { comparePriceAdidas } from './adidas/adidas.js';
import { comparePriceMusinsaAdidas } from './musinsa/musinsa-adidas.js';
import { generateMusinsaHTMLContent } from './musinsa/musinsa-generate-html.js';

/**
 * @fileName not include extension 如: 2025-10-05_07-41-45
 */
export async function comparePrice(e_brandSite, e_brandOption, fileName) {
	console.log('\n检查之前的文件以进行价格比较...');

	// 查找之前的JSON文件
	const prevFileName = findPreviousJSONFile(e_brandSite, e_brandOption, fileName);

	if (prevFileName) {
		console.log(`当前新抓取的数据将与之前的文件比较: ${prevFileName}`);

		// prevFileName 已经包含扩展名,如: 2025-10-16_23-06-51.json
		// 使用 getFilePath 辅助函数获取正确路径
		const prevFilePath = getFilePath(e_brandSite, prevFileName.replace('.json', ''), 'json');
		const previousProductFile = fs.readFileSync(prevFilePath, 'utf-8');
		const previousProductData = JSON.parse(previousProductFile);

		// currentFileName 已经包含 collection/e_brandSite/xxx.json
		const currentJSONFilePath = getFilePath(e_brandSite, fileName, 'json');
		const currentProductFile = fs.readFileSync(currentJSONFilePath, 'utf-8');
		const currentProductData = JSON.parse(currentProductFile);

		if (e_brandSite === E_BrandSite.Adidas) {
			comparePriceAdidas(e_brandSite, previousProductData, currentProductData, fileName, prevFileName);
		} else if (e_brandSite === E_BrandSite.Musinsa) {
			if (e_brandOption === E_BrandOption.Adidas) {
				comparePriceMusinsaAdidas(e_brandSite, previousProductData, currentProductData, fileName, prevFileName);
			}
		}
		// await sendEmailToSubscribers(currentFileName);
	} else {
		console.log('未找到之前的文件进行价格比较（这可能是第一次运行）');
		// 读取当前产品数据
		const currentFilePath = getFilePath(e_brandSite, fileName, 'json');
		const currentProductFile = fs.readFileSync(currentFilePath, 'utf-8');
		const currentProductData = JSON.parse(currentProductFile);

		const uniqueProducts = Object.values(currentProductData.products);
		const dateTimeString = currentProductData.dateTimeString;

		let htmlContent = '';
		if (e_brandSite === E_BrandSite.Adidas) {
			htmlContent = generateAdidasHTMLContent(uniqueProducts, dateTimeString);
		} else if (e_brandSite === E_BrandSite.Musinsa) {
			if (e_brandOption === E_BrandOption.Adidas) {
				htmlContent = generateMusinsaHTMLContent(uniqueProducts, dateTimeString);
			}
		}

		const htmlFilePathAndName = getFilePath(e_brandSite, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContent, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName}`);
	}
}

// 从文件名中提取时间戳
export function extractTimestampFromFilename(filename) {
	// 文件名格式: 2025-10-05_07-41-45.json
	// 支持 .json 扩展名
	// 匹配格式: yyyy-mm-dd_hh-mm-ss.json
	let match = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.json/);
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
 * @returns {string|null} 返回最新的文件名字.json，或null如果没有找到 '2025-10-16_23-06-51.json'
 */
export function findPreviousJSONFile(e_brandSite, e_brandOption, excludeFileName = null) {
	// 从项目根目录(当前工作目录)查找 collection/e_brandSite 文件夹
	let collectionDir = '';
	if (e_brandSite === E_BrandSite.Musinsa) {
		if (e_brandOption === E_BrandOption.Adidas) {
			collectionDir = path.resolve(process.cwd(), 'collection', e_brandSite, E_BrandOption.Adidas);
		} else if (e_brandOption === E_BrandOption.Nike) {
			collectionDir = path.resolve(process.cwd(), 'collection', e_brandSite, E_BrandOption.Nike);
		}
	} else if (e_brandSite === E_BrandSite.Adidas) {
		collectionDir = path.resolve(process.cwd(), 'collection', e_brandSite);
	}

	if (!fs.existsSync(collectionDir)) {
		console.log(`Collection/${e_brandSite}目录不存在，正在创建...`);
		fs.mkdirSync(collectionDir, { recursive: true });
	}
	console.log(`正在查找最新的JSON文件 in Collection/${e_brandSite}...`);

	const excludeBasename = excludeFileName ? `${path.basename(excludeFileName)}.json` : null;

	const files = fs
		.readdirSync(collectionDir)
		.filter((f) => f.endsWith('.json') && f !== excludeBasename)
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
		console.log(`找到上一个收集的文件: ${files[0].name}`);
		return files[0].name;
	} else {
		console.log('没有找到任何文件，这应该是第一次运行');
		return null;
	}
}

export function getCurrentDateTimeString() {
	return new Date().toLocaleString('ko-KR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

/**
 * @return file path like /path/to/project/collection/e_brandSite/2025-10-05_07-41-45.json
 */
export function getFilePath(e_brandSite, fileName, extension = 'json') {
	let collectionFolder = '';
	if (e_brandSite == E_BrandSite.Musinsa) {
		collectionFolder = path.resolve(process.cwd(), 'collection', E_BrandSite.Musinsa, E_BrandOption.Adidas); // <<< Musinsa/Adidas 专用路径 or Nike, update later
	} else {
		collectionFolder = path.resolve(process.cwd(), 'collection', e_brandSite);
	}
	if (!fs.existsSync(collectionFolder)) {
		fs.mkdirSync(collectionFolder, { recursive: true });
	}
	return path.resolve(collectionFolder, fileName + '.' + extension);
}

export function generateFileName(dateNow) {
	return `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')}_${String(
		dateNow.getHours()
	).padStart(2, '0')}-${String(dateNow.getMinutes()).padStart(2, '0')}-${String(dateNow.getSeconds()).padStart(2, '0')}`;
}

export function loadSettings() {
	try {
		const settings = JSON.parse(fs.readFileSync('./setting.json', 'utf-8'));

		// 验证必需字段
		if (!settings) {
			throw new Error('配置文件缺少');
		}

		return settings;
	} catch (error) {
		console.error('❌ 读取配置文件失败:', error.message);
		process.exit(1);
	}
}
