import fs from 'fs';
import path from 'path';
import { generateHTMLContent } from './generate-html.js';

/**
 * @fileName not include extension 如: 2025-10-05_07-41-45
 */
export async function comparePrice(fileName) {
	console.log('\n检查之前的文件以进行价格比较...');

	// 查找之前的JSON文件
	const prevFileName = findPreviousJSONFile(fileName);

	if (prevFileName) {
		console.log(`当前新抓取的数据将与之前的文件比较: ${prevFileName}`);

		// prevFileName 已经包含扩展名,如: 2025-10-16_23-06-51.json
		// 使用 getFilePath 辅助函数获取正确路径
		const prevFilePath = getFilePath(prevFileName.replace('.json', ''), 'json');
		const previousProductFile = fs.readFileSync(prevFilePath, 'utf-8');
		const previousProductData = JSON.parse(previousProductFile);

		// currentFileName 已经包含 collection/adidas/xxx.json
		const currentJSONFilePath = getFilePath(fileName, 'json');
		const currentProductFile = fs.readFileSync(currentJSONFilePath, 'utf-8');
		const currentProductData = JSON.parse(currentProductFile);

		if (previousProductData) {
			console.log(`从 ${prevFileName} 中提取了 ${Object.keys(previousProductData.products).length} 个产品`);
			console.log('\n开始比较价格...');

			let priceDropCount = 0;
			// 标记降价产品 - 比较当前抓取的数据与最新已保存文件的价格
			Object.values(currentProductData.products).forEach((product, index) => {
				// 兼容新旧数据格式: 价格可能是数字或字符串 "71,200 원"
				const currentPrice =
					typeof product.price === 'number'
						? product.price
						: (() => {
								const priceMatch = product.price.match(/([\d,]+)\s*원/);
								return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
							})();

				const previousProductInfo = previousProductData.products[product.code];
				const previousPrice = previousProductInfo?.price
					? typeof previousProductInfo.price === 'number'
						? previousProductInfo.price
						: (() => {
								const priceMatch = previousProductInfo.price.match(/([\d,]+)\s*원/);
								return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
							})()
					: null;
				const previousIsExtra30Off = previousProductInfo?.isExtra30Off || false;

				// 调试日志 - 只显示前5个产品
				if (index < 5) {
					console.log(`\n产品 ${index + 1}: ${product.code} - ${product.name}`);
					console.log(`  当前价格: ${currentPrice.toLocaleString()}`);
					console.log(`  之前价格: ${previousPrice ? previousPrice.toLocaleString() : '未找到'}`);
					console.log(`  价格下降: ${previousPrice && currentPrice < previousPrice ? '是' : '否'}`);
				}

				if (!previousPrice) {
					// 新产品
					product.isNewItem = true;
					console.log(`✓ 新产品: ${product.code} - ${product.name}: ${currentPrice.toLocaleString()} 원`);
				} else if (currentPrice < previousPrice) {
					// 价格下降
					product.isPriceDropped = true;
					product.previousPrice = previousPrice.toLocaleString() + ' 원';
					product.priceGap = (previousPrice - currentPrice).toLocaleString() + ' 원';
					priceDropCount++;
					console.log(
						`✓ 价格下降: ${product.code} - ${product.name}: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (降了 ${
							product.priceGap
						})`
					);
				} else if (currentPrice > previousPrice) {
					// 价格上涨
					product.isPriceIncreased = true;
					product.previousPrice = previousPrice.toLocaleString() + ' 원';
					product.priceGap = (currentPrice - previousPrice).toLocaleString() + ' 원';
					console.log(
						`✓ 价格上涨: ${product.code} - ${product.name}: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (涨了 ${
							product.priceGap
						})`
					);
				}

				// 新增额外30%折扣标记
				if (!previousIsExtra30Off) {
					product.isNewExtra30Off = product.isExtra30Off || false;
				}

				// 统一将价格转换为数字格式(如果还不是的话)
				if (typeof product.price !== 'number') {
					product.price = currentPrice;
				}
			});

			// 查找已下架的产品
			const removedProducts = [];
			const currentCodes = new Set(Object.keys(currentProductData.products));
			Object.entries(previousProductData.products).forEach(([code, productInfo]) => {
				if (!currentCodes.has(code)) {
					removedProducts.push({
						code: code,
						price: productInfo.price,
					});
					console.log(`✓ 已下架: ${code}: ${productInfo.price}`);
				}
			});

			// 统计摘要
			const uniqueProducts = Object.values(currentProductData.products);
			const newItemCount = uniqueProducts.filter((p) => p.isNewItem).length;
			const priceIncreaseCount = uniqueProducts.filter((p) => p.isPriceIncreased).length;

			console.log(`\n=== 价格比较摘要 ===`);
			console.log(`价格下降: ${priceDropCount} 件`);
			console.log(`价格上涨: ${priceIncreaseCount} 件`);
			console.log(`新产品: ${newItemCount} 件`);
			console.log(`已下架: ${removedProducts.length} 件`);
			console.log(`==================\n`);

			// 直接从JSON数据中获取日期时间字符串,不需要从文件名解析
			const previousDateTimeString = previousProductData.dateTimeString;
			const dateTimeString = currentProductData.dateTimeString;

			// 重新生成HTML，包含价格比较信息
			const htmlContentWithComparison = generateHTMLContent(uniqueProducts, dateTimeString, previousDateTimeString, removedProducts);
			const htmlFilePathAndName = getFilePath(fileName, 'html');
			fs.writeFileSync(htmlFilePathAndName, htmlContentWithComparison, 'utf8');
			console.log(`\n产品信息已保存到 ${htmlFilePathAndName} (包含价格比较)`);

			// await sendEmailToSubscribers(currentFileName);
		} else {
			console.log('无法从之前的文件中提取价格信息');
			const uniqueProducts = Object.values(currentProductData.products);
			const dateTimeString = currentProductData.dateTimeString;
			const htmlContent = generateHTMLContent(uniqueProducts, dateTimeString);
			const htmlFilePathAndName = getFilePath(fileName, 'html');
			fs.writeFileSync(htmlFilePathAndName, htmlContent, 'utf8');
			console.log(`\n产品信息已保存到 ${htmlFilePathAndName}`);
		}
	} else {
		console.log('未找到之前的文件进行价格比较（这可能是第一次运行）');
		// 读取当前产品数据
		const currentFilePath = getFilePath(fileName, 'json');
		const currentProductFile = fs.readFileSync(currentFilePath, 'utf-8');
		const currentProductData = JSON.parse(currentProductFile);

		const uniqueProducts = Object.values(currentProductData.products);
		const dateTimeString = currentProductData.dateTimeString;
		const htmlContent = generateHTMLContent(uniqueProducts, dateTimeString);
		const htmlFilePathAndName = getFilePath(fileName, 'html');
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
export function findPreviousJSONFile(excludeFileName = null, isSearchingErrorJSON = false) {
	// 从项目根目录(当前工作目录)查找 collection/adidas 文件夹
	const collectionDir = path.resolve(process.cwd(), 'collection', 'adidas');

	if (!fs.existsSync(collectionDir)) {
		console.log('Collection/adidas目录不存在，正在创建...');
		fs.mkdirSync(collectionDir, { recursive: true });
	}
	console.log('正在查找最新的JSON文件...');

	const excludeBasename = excludeFileName ? `${path.basename(excludeFileName)}.json` : null;

	const files = fs
		.readdirSync(collectionDir)
		.filter((f) => f.endsWith('.json') && f !== excludeBasename)
		.map((f) => {
			const timestamp = extractTimestampFromFilename(f);
			// 读取文件内容检查 hasError 状态
			const filePath = path.join(collectionDir, f);
			let hasError = false;
			try {
				const fileContent = fs.readFileSync(filePath, 'utf-8');
				const jsonData = JSON.parse(fileContent);
				hasError = jsonData.hasError || false;
			} catch (error) {
				console.log(`无法读取文件 ${f}: ${error.message}`);
			}

			return {
				name: f,
				timestamp: timestamp,
				hasError: hasError,
			};
		})
		.filter((f) => {
			if (!f.timestamp) {
				console.log(`跳过无效时间戳的文件: ${f.name}`);
				return false;
			}

			// 根据 isSearchingErrorJSON 参数决定过滤条件
			if (isSearchingErrorJSON) {
				// 查找有错误的文件 (未完成的抓取)
				if (f.hasError) {
					console.log(`找到未完成的抓取文件: ${f.name}, hasError: true ✓`);
					return true;
				} else {
					console.log(`跳过已完成的文件: ${f.name}, hasError: false`);
					return false;
				}
			} else {
				// 查找成功完成的文件 (用于价格比较)
				if (!f.hasError) {
					console.log(`找到成功完成的文件: ${f.name}, hasError: false ✓`);
					return true;
				} else {
					console.log(`跳过有错误的文件: ${f.name}, hasError: true`);
					return false;
				}
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

export function getFilePath(fileName, extension = 'json') {
	const collectionFolder = path.resolve(process.cwd(), 'collection', 'adidas');
	if (!fs.existsSync(collectionFolder)) {
		fs.mkdirSync(collectionFolder, { recursive: true });
	}
	return path.resolve(collectionFolder, fileName + '.' + extension);
}

export async function getTotalPages(page) {
	return await page.evaluate(() => {
		const indicator = document.querySelector('[data-testid="page-indicator"]');
		if (indicator) {
			const text = indicator.textContent.trim();
			const match = text.match(/(\d+)\s*\/\s*(\d+)/);
			if (match) {
				return {
					current: parseInt(match[1]),
					total: parseInt(match[2]),
				};
			}
		}
		return null;
	});
}

export function loadSettings() {
	try {
		const settings = JSON.parse(fs.readFileSync('./setting.json', 'utf-8'));

		// 验证必需字段
		if (!settings.adidas?.url) {
			throw new Error('配置文件缺少 adidas.url');
		}
		if (!settings.adidas?.itemPerPage) {
			throw new Error('配置文件缺少 adidas.itemPerPage');
		}

		return settings;
	} catch (error) {
		console.error('❌ 读取配置文件失败:', error.message);
		process.exit(1);
	}
}
