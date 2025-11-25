import fs from 'fs';

import type { MusinsaApiProduct, MusinsaApiResponse, MusinsaProduct, MusinsaProductData } from '../../types/musinsa-product';
import type { Settings } from '../../types/settings';

import { E_BrandSite } from '../../enum/enum-brand-site';
import { E_BrandOption, E_BrandOption_GetString } from '../../enum/enum-musinsa';
import { comparePrice, generateFileName, getCurrentDateTimeString, getFilePath, loadSettings } from '../../utils/common';

/**
 * 抓取 Musinsa 产品数据
 * @param e_brandOption - 品牌选项 (默认为 Adidas)
 */
async function scrapeMusinsaProducts(e_brandOption: E_BrandOption = E_BrandOption.Adidas): Promise<void> {
	const settings: Settings = loadSettings();
	const products: MusinsaApiProduct[] = [];

	let totalPageNumber: number = 1;
	let currentPage: number = 1;
	let hasError: boolean = false;
	let pageNum: number = 1;
	const uniqueProducts: Record<string, MusinsaProduct> = {}; // 使用对象来存储唯一的产品，键为 goodsNo

	while (currentPage <= totalPageNumber) {
		// 构造 URL，替换 page 参数
		const apiUrl = settings.musinsa[e_brandOption].url.replace('{PAGE}', currentPage.toString());

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		});
		const res = (await response.json()) as MusinsaApiResponse;
		if (res && res.data && res.data.list && res.data.pagination && res.meta.result === 'SUCCESS') {
			products.push(...res.data.list);

			// 更新总页数
			if (currentPage === 1) {
				totalPageNumber = res.data.pagination.totalPages;
				console.log(`总共 ${totalPageNumber} 页，总商品数: ${res.data.pagination.totalCount}`);
			}

			if (settings.isDebugMode) {
				totalPageNumber = 2; // 调试模式只抓前2页
			}

			console.log(`第 ${currentPage}/${totalPageNumber} 页抓取完成，本页商品数: ${res.data.list.length}`);

			// 稍微等待一下，防止请求太快被封
			await new Promise((r) => setTimeout(r, 2000));
			currentPage++;
		} else {
			console.error('API 返回数据格式不正确:', res);
			break;
		}
	}

	console.log(`\n抓取完成! 总共抓取到 ${products.length} 个商品`);

	if (products.length) {
		// 去重
		for (const product of products) {
			// goodsName: '아디폼 슈퍼스타 - 화이트:블랙 / HQ8750'
			let code: string = '';
			const nameParts = product.goodsName.split('/');
			if (nameParts.length > 1) {
				code = nameParts[1].trim();
			} else {
				code = product.goodsNo.toString();
			}
			// console.log(code);
			// 将 MusinsaApiProduct 转换为 MusinsaProduct (添加 code 字段)
			const musinsaProduct: MusinsaProduct = {
				...product,
				code: code,
			};
			uniqueProducts[code] = musinsaProduct;
		}
		console.log(`去重后共有 ${Object.keys(uniqueProducts).length} 个唯一商品`);
	}

	// 保存到HTML文件
	const dateNow: Date = new Date();
	const dateTimeString: string = getCurrentDateTimeString();

	const fileName: string = generateFileName(dateNow);

	// 保存最新数据到JSON文件
	const jsonFilePathAndName: string = getFilePath(E_BrandSite.Musinsa, e_brandOption, fileName, 'json');

	const jsonData: MusinsaProductData = {
		dateTimeString: dateTimeString,
		timestamp: dateNow.toISOString(),
		hasError: hasError,
		errorPageNum: pageNum,
		totalProducts: Object.keys(uniqueProducts).length,
		products: uniqueProducts,
	};

	console.log(`保存最新数据到 JSON 文件: ${jsonFilePathAndName}`);
	fs.writeFileSync(jsonFilePathAndName, JSON.stringify(jsonData, null, 2), 'utf-8');
	console.log('JSON 文件保存成功');

	await comparePrice(E_BrandSite.Musinsa, e_brandOption, fileName);
}

/**
 * 运行 Musinsa 爬虫任务
 * @param e_brandOption - 品牌选项 (默认为 Adidas)
 */
export async function runMusinsaTask(e_brandOption: E_BrandOption = E_BrandOption.Adidas): Promise<void> {
	console.log(`正在执行 ${E_BrandOption_GetString[e_brandOption]}`);

	// 调用爬虫逻辑,传入 e_brandOption
	scrapeMusinsaProducts(e_brandOption)
		.then(() => {
			console.log('\n脚本执行完成!');
			setTimeout(() => {
				process.exit(0);
			}, 1000);
		})
		.catch((error: Error) => {
			console.error('发生错误:', error);
			process.exit(1);
		});
}
