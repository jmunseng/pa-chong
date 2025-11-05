import fs from 'fs';
import { generateHTMLContent } from './generate-html.js';
import { findPreviousJSONFile, getFilePath } from './common.js';

/**
 * @fileName not include extension 如: adidas-extra-sale-products_2025-10-05_07-41-45
 */
export async function comparePrice(fileName) {
	console.log('\n检查之前的文件以进行价格比较...');

	// 查找之前的JSON文件
	const prevFileName = findPreviousJSONFile(fileName);

	if (prevFileName) {
		console.log(`当前新抓取的数据将与之前的文件比较: ${prevFileName}`);

		// prevFileName 已经包含扩展名,如: adidas-extra-sale-products_2025-10-16_23-06-51.json
		const prevFilePath = `collection/${prevFileName}`;
		const previousProductFile = fs.readFileSync(prevFilePath, 'utf-8');
		const previousProductData = JSON.parse(previousProductFile);

		// currentFileName 已经包含 collection/ xxx.json
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
		// currentFileName 已经包含 collection/ 前缀,只需添加 .json
		const currentFilePath = `${fileName}.json`;
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
