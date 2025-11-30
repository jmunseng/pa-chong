import fs from 'fs';

import type { NikeOfficialApiProduct, NikeOfficialApiResponse } from '../../types/nike-official-api';
import type { NikeProduct } from '../../types/nike-product';
import type { Settings } from '../../types/settings';

import { E_BrandSite } from '../../enum/enum-brand-site';
import { E_BrandOption } from '../../enum/enum-musinsa';
import { comparePrice, generateFileName, getCurrentDateTimeString, getFilePath, loadSettings } from '../../utils/common';

/**
 * Nike API 基础 URL
 */
const NIKE_API_BASE_URL =
	'https://api.nike.com/discover/product_wall/v1/marketplace/KR/language/ko/consumerChannelId/d9a5bc42-4b9c-4976-858a-f159cf99c647';

/**
 * Nike API 查询参数
 * 未使用这个参数, 使用Settings中的配置
 */
const NIKE_API_PARAMS = {
	path: '/kr/w/clearance-shoes-3yaepzy7ok',
	attributeIds: '16633190-45e5-4830-a068-232ac7aea82c,5b21a62a-0503-400c-8336-3ccfbff2a684',
	queryType: 'PRODUCTS',
	count: 100, // 每页 100 个产品 (Nike API 支持: 24, 50, 100)
};

/**
 * 生成 Nike API 请求头
 */
function getNikeApiHeaders(): Record<string, string> {
	return {
		Accept: 'application/json',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		DNT: '1',
		Host: 'api.nike.com',
		Origin: 'https://www.nike.com',
		Pragma: 'no-cache',
		Referer: 'https://www.nike.com/kr/w/clearance-shoes-3yaepzy7ok',
		'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
		'Sec-CH-UA-Mobile': '?0',
		'Sec-CH-UA-Platform': '"macOS"',
		'Sec-Fetch-Dest': 'empty',
		'Sec-Fetch-Mode': 'cors',
		'Sec-Fetch-Site': 'same-site',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
		'nike-api-caller-id': 'd9a5bc42-4b9c-4976-858a-f159cf99c647',
	};
}

/**
 * 构建 Nike API URL
 * @param anchor - 分页锚点 (起始索引,从 1 开始)
 * @returns API URL
 */
function buildNikeApiUrl(anchor: number): string {
	const settings: Settings = loadSettings();

	const params = new URLSearchParams({
		path: settings.nike.path,
		attributeIds: settings.nike.attributeIds,
		queryType: settings.nike.queryType,
		anchor: anchor.toString(),
		count: settings.nike.count.toString(),
	});

	return `${NIKE_API_BASE_URL}?${params.toString()}`;
}

/**
 * 抓取单个页面的数据
 * @param anchor - 分页锚点
 * @returns 该页的产品列表
 */
async function fetchPage(anchor: number): Promise<NikeOfficialApiProduct[]> {
	const apiUrl = buildNikeApiUrl(anchor);

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: getNikeApiHeaders(),
		});

		if (!response.ok) {
			console.error(`❌ 锚点 ${anchor} 返回状态码: ${response.status}`);
			return [];
		}

		const res = (await response.json()) as NikeOfficialApiResponse;

		if (res && res.productGroupings && Array.isArray(res.productGroupings)) {
			// 从产品组中提取所有产品
			const products: NikeOfficialApiProduct[] = [];
			for (const group of res.productGroupings) {
				if (group.products && Array.isArray(group.products)) {
					products.push(...group.products);
				}
			}
			console.log(`✅ 锚点 ${anchor} 抓取完成，商品数: ${products.length}`);
			return products;
		} else {
			console.error(`❌ 锚点 ${anchor} 返回数据格式不正确`);
			return [];
		}
	} catch (error) {
		console.error(`❌ 锚点 ${anchor} 抓取失败:`, error);
		return [];
	}
}

/**
 * 抓取 Nike 产品数据 (使用官方 API)
 */
async function scrapeNikeProductsApi(): Promise<void> {
	const settings: Settings = loadSettings();
	const allProducts: NikeOfficialApiProduct[] = [];
	let hasError: boolean = false;

	// 第一步：获取第一页以确定总商品数和获取首页产品
	console.log('正在获取第一页以确定总商品数...');
	try {
		const firstPageUrl = buildNikeApiUrl(0); // Nike API 从 0 开始
		const firstResponse = await fetch(firstPageUrl, {
			method: 'GET',
			headers: getNikeApiHeaders(),
		});

		if (!firstResponse.ok) {
			console.error('❌ 无法获取第一页数据');
			console.log(`firstResponse:`, firstResponse);
			return;
		}

		const firstPageData = (await firstResponse.json()) as NikeOfficialApiResponse;

		// 从产品组中提取所有产品
		const firstPageProducts: NikeOfficialApiProduct[] = [];
		for (const group of firstPageData.productGroupings) {
			if (group.products && Array.isArray(group.products)) {
				firstPageProducts.push(...group.products);
			}
		}

		allProducts.push(...firstPageProducts);

		const totalPages = firstPageData.pages.totalPages;
		const totalCount = firstPageData.pages.totalResources;
		const pageSize = settings.nike.count;

		console.log(`📊 总商品数: ${totalCount}，每页 ${pageSize} 件，总页数: ${totalPages}`);

		// 计算需要抓取的页数
		let pagesToFetch = totalPages;

		if (settings.isDebugMode) {
			pagesToFetch = Math.min(2, totalPages); // 调试模式只抓前2页
			console.log(`🔧 调试模式：限制为 ${pagesToFetch} 页`);
		}

		// 第二步：按顺序抓取剩余页面,每页随机间隔 3-7 秒
		if (pagesToFetch > 1) {
			console.log(`\n🚀 开始抓取第 2-${pagesToFetch} 页 (每页随机间隔 3-7 秒)...`);

			for (let pageIndex = 2; pageIndex <= pagesToFetch; pageIndex++) {
				// Nike API 使用 anchor 参数进行分页
				// anchor = (pageIndex - 1) * pageSize + 1
				const anchor = (pageIndex - 1) * pageSize + 1;

				console.log(`📄 正在抓取第 ${pageIndex}/${pagesToFetch} 页 (锚点: ${anchor})...`);

				const pageProducts = await fetchPage(anchor);

				if (pageProducts.length === 0) {
					hasError = true;
					console.warn(`⚠️  第 ${pageIndex} 页抓取失败`);
				} else {
					allProducts.push(...pageProducts);
					console.log(`✅ 第 ${pageIndex} 页抓取成功,获得 ${pageProducts.length} 个商品`);
				}

				// 如果不是最后一页,随机等待 3-7 秒
				if (pageIndex < pagesToFetch) {
					const randomDelay = Math.floor(Math.random() * 4000) + 3000; // 3000-7000ms
					console.log(`⏳ 等待 ${(randomDelay / 1000).toFixed(1)} 秒后继续...`);
					await new Promise((resolve) => setTimeout(resolve, randomDelay));
				}
			}
		}
	} catch (error) {
		console.error('❌ 抓取过程中发生错误:', error);
		return;
	}

	console.log(`\n抓取完成! 总共抓取到 ${allProducts.length} 个商品`);

	// 转换为我们自己的产品格式并去重
	const uniqueProducts: Record<string, NikeProduct> = {};

	for (const apiProduct of allProducts) {
		const code = apiProduct.productCode;

		// 提取价格信息
		const price = apiProduct.prices.currentPrice;
		const originalPrice = apiProduct.prices.initialPrice;
		const discountPercentage = apiProduct.prices.discountPercentage;

		uniqueProducts[code] = {
			code: code,
			name: apiProduct.copy.title,
			price: price,
			originalPrice: originalPrice,
			discountPercentage: discountPercentage,
			url: `https://www.nike.com${apiProduct.pdpUrl.path}`,
			imageUrl: apiProduct.colorwayImages.portraitURL,
			subTitle: apiProduct.copy.subTitle,
			colorDescription: apiProduct.displayColors.colorDescription,
		};
	}

	console.log(`去重后共有 ${Object.keys(uniqueProducts).length} 个唯一商品`);

	// 保存到文件
	const dateNow: Date = new Date();
	const dateTimeString: string = getCurrentDateTimeString();
	const fileName: string = generateFileName(dateNow);

	// 保存最新数据到JSON文件
	const jsonFilePathAndName: string = getFilePath(E_BrandSite.Nike, E_BrandOption.Nike, fileName, 'json');

	const jsonData = {
		dateTimeString: dateTimeString,
		timestamp: dateNow.toISOString(),
		hasError: hasError,
		totalProducts: Object.keys(uniqueProducts).length,
		products: uniqueProducts,
	};

	console.log(`保存最新数据到 JSON 文件: ${jsonFilePathAndName}`);
	fs.writeFileSync(jsonFilePathAndName, JSON.stringify(jsonData, null, 2), 'utf-8');
	console.log('JSON 文件保存成功');

	await comparePrice(E_BrandSite.Nike, E_BrandOption.Nike, fileName);
}

/**
 * 运行 Nike API 爬虫任务
 */
export async function runNikeApiTask(): Promise<void> {
	console.log('正在执行 Nike API 抓取任务...');

	scrapeNikeProductsApi()
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
