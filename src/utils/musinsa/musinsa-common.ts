import fs from 'fs';

import type { MusinsaProduct, MusinsaProductData, RemovedProduct } from '../../types/musinsa-product';

import { E_BrandSite } from '../../enum/enum-brand-site';
import { E_BrandOption } from '../../enum/enum-musinsa';
import { getFilePath } from '../common';
import { generateMusinsaHTMLContent } from './musinsa-generate-html';

export function comparePriceMusinsa(
	e_brandSite: E_BrandSite,
	e_brandOption: E_BrandOption,
	previousProductData: MusinsaProductData | null,
	currentProductData: MusinsaProductData,
	fileName: string,
	prevFileName: string
) {
	if (previousProductData) {
		console.log(`从 ${prevFileName} 中提取了 ${Object.keys(previousProductData.products).length} 个产品`);
		console.log('\n开始比较价格...');

		let priceDropCount = 0;
		// 标记降价产品 - 比较当前抓取的数据与最新已保存文件的价格
		Object.entries(currentProductData.products).forEach(([code, product], index) => {
			// Musinsa 的价格已经是数字类型
			const currentPrice = product.price;

			const previousProductInfo = previousProductData.products[code];
			const previousPrice = previousProductInfo?.price || null;

			// 调试日志 - 只显示前5个产品
			if (index < 5) {
				console.log(`\n产品 ${index + 1}: ${code} - ${product.goodsName}`);
				console.log(`  当前价格: ${currentPrice.toLocaleString()} 원`);
				console.log(`  之前价格: ${previousPrice ? previousPrice.toLocaleString() + ' 원' : '未找到'}`);
				console.log(`  价格下降: ${previousPrice && currentPrice < previousPrice ? '是' : '否'}`);
			}

			if (!previousPrice) {
				// 新产品
				product.isNewItem = true;
				// console.log(`✓ 新产品: ${code} - ${product.goodsName}: ${currentPrice.toLocaleString()} 원`);
			} else if (currentPrice < previousPrice) {
				// 价格下降
				product.isPriceDropped = true;
				product.previousPrice = previousPrice;
				product.priceGap = previousPrice - currentPrice;
				priceDropCount++;
				// console.log(
				// 	`✓ 价格下降: ${code} - ${product.goodsName}: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (降了 ${product.priceGap.toLocaleString()} 원)`
				// );
			} else if (currentPrice > previousPrice) {
				// 价格上涨
				product.isPriceIncreased = true;
				product.previousPrice = previousPrice;
				product.priceGap = currentPrice - previousPrice;
				// console.log(
				// 	`✓ 价格上涨: ${code} - ${product.goodsName}: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (涨了 ${product.priceGap.toLocaleString()} 원)`
				// );
			}

			// 确保 product 对象有 code 字段(用于 HTML 模板)
			product.code = code;
		});

		// 查找已下架的产品
		const removedProducts: RemovedProduct[] = [];
		const currentCodes = new Set(Object.keys(currentProductData.products));
		Object.entries(previousProductData.products).forEach(([code, productInfo]) => {
			if (!currentCodes.has(code)) {
				removedProducts.push({
					code: code,
					goodsName: productInfo.goodsName,
					price: productInfo.price,
					goodsLinkUrl: productInfo.goodsLinkUrl,
					thumbnail: productInfo.thumbnail,
				});
				// console.log(`✓ 已下架: ${code} - ${productInfo.goodsName}: ${productInfo.price.toLocaleString()} 원`);
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
		const htmlContentWithComparison = generateMusinsaHTMLContent(
			e_brandOption,
			uniqueProducts,
			dateTimeString,
			previousDateTimeString,
			removedProducts
		);
		const htmlFilePathAndName = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContentWithComparison, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName} (包含价格比较)`);
	} else {
		console.log('无法从之前的文件中提取价格信息');
		const uniqueProducts = Object.values(currentProductData.products);
		const dateTimeString = currentProductData.dateTimeString;
		const htmlContent = generateMusinsaHTMLContent(e_brandOption, uniqueProducts, dateTimeString);
		const htmlFilePathAndName = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContent, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName}`);
	}
}
