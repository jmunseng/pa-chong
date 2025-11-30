import fs from 'fs';
import path from 'path';

import type { Settings } from '../types/settings';

import { E_BrandSite } from '../enum/enum-brand-site';
import { E_BrandOption } from '../enum/enum-musinsa';
import { comparePriceAdidas } from './adidas/adidas';
import { generateAdidasHTMLContent } from './adidas/adidas-generate-html';
import { comparePriceMusinsa } from './musinsa/musinsa-common';
import { generateMusinsaHTMLContent } from './musinsa/musinsa-generate-html';
import { comparePriceNike } from './nike/nike-common';

/**
 * 比较价格并生成 HTML 报告
 * @param e_brandSite - 品牌网站
 * @param e_brandOption - 品牌选项
 * @param fileName - 文件名(不包含扩展名),如: 2025-10-05_07-41-45
 */
export async function comparePrice(e_brandSite: E_BrandSite, e_brandOption: E_BrandOption, fileName: string): Promise<void> {
	console.log('\n检查之前的文件以进行价格比较...');

	// 查找之前的JSON文件
	const prevFileName: string | null = findPreviousJSONFile(e_brandSite, e_brandOption, fileName);

	if (prevFileName) {
		console.log(`当前新抓取的数据将与之前的文件比较: ${prevFileName}`);

		// prevFileName 已经包含扩展名,如: 2025-10-16_23-06-51.json
		// 使用 getFilePath 辅助函数获取正确路径
		const prevFilePath: string = getFilePath(e_brandSite, e_brandOption, prevFileName.replace('.json', ''), 'json');
		const previousProductFile: string = fs.readFileSync(prevFilePath, 'utf-8');
		const previousProductData: any = JSON.parse(previousProductFile);

		// currentFileName 已经包含 collection/e_brandSite/xxx.json
		const currentJSONFilePath: string = getFilePath(e_brandSite, e_brandOption, fileName, 'json');
		const currentProductFile: string = fs.readFileSync(currentJSONFilePath, 'utf-8');
		const currentProductData: any = JSON.parse(currentProductFile);

		if (e_brandSite === E_BrandSite.Adidas) {
			comparePriceAdidas(e_brandSite, e_brandOption, previousProductData, currentProductData, fileName, prevFileName);
		} else if (e_brandSite === E_BrandSite.Musinsa) {
			comparePriceMusinsa(e_brandSite, e_brandOption, previousProductData, currentProductData, fileName, prevFileName);
		} else if (e_brandSite === E_BrandSite.Nike) {
			comparePriceNike(e_brandSite, null, previousProductData, currentProductData, fileName, prevFileName);
		}
		// await sendEmailToSubscribers(currentFileName);
	} else {
		console.log('未找到之前的文件进行价格比较（这可能是第一次运行）');
		// 读取当前产品数据
		const currentFilePath: string = getFilePath(e_brandSite, e_brandOption, fileName, 'json');
		const currentProductFile: string = fs.readFileSync(currentFilePath, 'utf-8');
		const currentProductData: any = JSON.parse(currentProductFile);

		const uniqueProducts: any[] = Object.values(currentProductData.products);
		const dateTimeString: string = currentProductData.dateTimeString;

		let htmlContent: string = '';
		if (e_brandSite === E_BrandSite.Adidas) {
			htmlContent = generateAdidasHTMLContent(uniqueProducts, dateTimeString);
		} else if (e_brandSite === E_BrandSite.Musinsa) {
			htmlContent = generateMusinsaHTMLContent(e_brandOption, uniqueProducts, dateTimeString);
		}

		const htmlFilePathAndName: string = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContent, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName}`);
	}
}

/**
 * 从文件名中提取时间戳
 * @param filename - 文件名,格式: 2025-10-05_07-41-45.json
 * @returns Date 对象或 null
 */
export function extractTimestampFromFilename(filename: string): Date | null {
	// 文件名格式: 2025-10-05_07-41-45.json
	// 支持 .json 扩展名
	// 匹配格式: yyyy-mm-dd_hh-mm-ss.json
	const match: RegExpMatchArray | null = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.json/);
	if (match) {
		// 格式: 2025-10-05_07-41-45，转换为标准时间格式
		const dateStr: string = match[1];
		const timeStr: string = `${match[2]}:${match[3]}:${match[4]}`;
		return new Date(`${dateStr}T${timeStr}`);
	}

	console.log('无法匹配文件名格式:', filename);
	return null;
}

/**
 * 查找最新的 JSON 文件
 * @param e_brandSite - 品牌网站
 * @param e_brandOption - 品牌选项
 * @param excludeFileName - 排除的文件名(不包括扩展名)
 * @returns 返回最新的文件名.json,如 '2025-10-16_23-06-51.json',或 null 如果没有找到
 */
export function findPreviousJSONFile(e_brandSite: E_BrandSite, e_brandOption: E_BrandOption, excludeFileName: string | null = null): string | null {
	// 从项目根目录(当前工作目录)查找 collection/e_brandSite 文件夹
	let collectionDir: string = '';
	if (e_brandSite === E_BrandSite.Musinsa) {
		if (e_brandOption === E_BrandOption.Adidas) {
			collectionDir = path.resolve(process.cwd(), 'collection', e_brandSite, E_BrandOption.Adidas);
		} else if (e_brandOption === E_BrandOption.Nike) {
			collectionDir = path.resolve(process.cwd(), 'collection', e_brandSite, E_BrandOption.Nike);
		}
	} else if (e_brandSite === E_BrandSite.Adidas || e_brandSite === E_BrandSite.Nike) {
		collectionDir = path.resolve(process.cwd(), 'collection', e_brandSite);
	} else {
		throw new Error(`Collection brand folder missing: ${e_brandSite}`);
	}

	if (!fs.existsSync(collectionDir)) {
		console.log(`Collection/${e_brandSite}目录不存在，正在创建...`);
		fs.mkdirSync(collectionDir, { recursive: true });
	}
	console.log(`正在查找最新的JSON文件 in Collection/${e_brandSite}...`);

	const excludeBasename: string | null = excludeFileName ? `${path.basename(excludeFileName)}.json` : null;

	interface FileWithTimestamp {
		name: string;
		timestamp: Date | null;
	}

	const files: FileWithTimestamp[] = fs
		.readdirSync(collectionDir)
		.filter((f: string) => f.endsWith('.json') && f !== excludeBasename)
		.map((f: string): FileWithTimestamp => {
			const timestamp: Date | null = extractTimestampFromFilename(f);
			return {
				name: f,
				timestamp: timestamp,
			};
		})
		.filter((f: FileWithTimestamp): f is FileWithTimestamp & { timestamp: Date } => {
			if (f.timestamp) {
				console.log(`文件: ${f.name}, 时间: ${f.timestamp.toISOString()}`);
				return true;
			} else {
				console.log(`跳过无效时间戳的文件: ${f.name}`);
				return false;
			}
		})
		.sort((a, b) => {
			const aTime: number = a.timestamp.getTime();
			const bTime: number = b.timestamp.getTime();
			return bTime - aTime;
		}); // 按时间降序排列，最新的在前
	if (files.length >= 1) {
		console.log(`找到上一个收集的文件: ${files[0].name}`);
		return files[0].name;
	} else {
		console.log('没有找到任何文件，这应该是第一次运行');
		return null;
	}
}

/**
 * 获取当前日期时间字符串(韩国时区格式)
 * @returns 格式化的日期时间字符串
 */
export function getCurrentDateTimeString(): string {
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
 * 获取文件路径
 * @param e_brandSite - 品牌网站
 * @param e_brandOption - 品牌选项
 * @param fileName - 文件名(不含扩展名)
 * @param extension - 文件扩展名,默认为 'json'
 * @returns 完整文件路径,如 /path/to/project/collection/e_brandSite/2025-10-05_07-41-45.json
 */
export function getFilePath(
	e_brandSite: E_BrandSite,
	e_brandOption: E_BrandOption | null,
	fileName: string,
	extension: string | null = 'json'
): string {
	let collectionFolder: string = '';
	if (e_brandSite == E_BrandSite.Musinsa) {
		collectionFolder = path.resolve(process.cwd(), 'collection', E_BrandSite.Musinsa, e_brandOption as E_BrandOption);
	} else {
		collectionFolder = path.resolve(process.cwd(), 'collection', e_brandSite);
	}
	if (!fs.existsSync(collectionFolder)) {
		fs.mkdirSync(collectionFolder, { recursive: true });
	}
	return path.resolve(collectionFolder, fileName + '.' + extension);
}

/**
 * 生成文件名
 * @param dateNow - 日期对象
 * @returns 格式化的文件名,如 2025-10-05_07-41-45
 */
export function generateFileName(dateNow: Date): string {
	return `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(dateNow.getDate()).padStart(2, '0')}_${String(
		dateNow.getHours()
	).padStart(2, '0')}-${String(dateNow.getMinutes()).padStart(2, '0')}-${String(dateNow.getSeconds()).padStart(2, '0')}`;
}

/**
 * 加载配置文件
 * @returns 配置对象
 * @throws 如果配置文件读取失败则退出程序
 */
export function loadSettings(): Settings {
	try {
		const settingsContent: string = fs.readFileSync('./setting.json', 'utf-8');
		const settings: Settings = JSON.parse(settingsContent);

		// 验证必需字段
		if (!settings) {
			throw new Error('配置文件缺少');
		}

		return settings;
	} catch (error) {
		console.error('❌ 读取配置文件失败:', (error as Error).message);
		process.exit(1);
	}
}
