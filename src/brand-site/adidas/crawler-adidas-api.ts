import fs from 'fs';

import type { AdidasProduct } from '../../types/adidas-product';
import type { AdidasApiExtra30Response, AdidasApiProduct, AdidasApiResponse } from '../../types/adidas-product-api';
import type { Settings } from '../../types/settings';

import { E_EventOptions } from '../../enum/enum-adidas';
import { E_BrandSite } from '../../enum/enum-brand-site';
import { E_BrandOption } from '../../enum/enum-musinsa';
import { comparePrice, generateFileName, getBrowserHeaders, getCurrentDateTimeString, getFilePath, loadSettings } from '../../utils/common';

function delay(min = 1000, max = 5000): Promise<void> {
	return new Promise((res) => setTimeout(res, Math.random() * (max - min) + min));
}

/**
 * 抓取单个页面的数据
 * @param apiUrlTemplate - API URL 模板 (包含 {StartIndex} 占位符)
 * @param startItem - 起始项索引
 * @returns 该页的产品列表
 */
async function fetchPage(apiUrlTemplate: string, startItem: number): Promise<AdidasApiProduct[]> {
	const apiUrl = apiUrlTemplate.replace('{StartIndex}', startItem.toString());

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: getBrowserHeaders(apiUrl),
		});

		if (!response.ok) {
			console.error(`❌ 起始索引 ${startItem} 返回状态码: ${response.status}`);
			return [];
		}

		const res = (await response.json()) as AdidasApiResponse;

		if (res && res.pageProps && res.pageProps.products && Array.isArray(res.pageProps.products)) {
			console.log(`✅ 起始索引 ${startItem} 抓取完成，商品数: ${res.pageProps.products.length}`);
			return res.pageProps.products;
		} else {
			console.error(`❌ 起始索引 ${startItem} 返回数据格式不正确`);
			return [];
		}
	} catch (error) {
		console.error(`❌ 起始索引 ${startItem} 抓取失败:`, error);
		return [];
	}
}

/**
 * 抓取 Adidas 产品数据 (使用 API)
 */
async function scrapeAdidasProductsApi(): Promise<void> {
	const settings: Settings = loadSettings();
	const allProducts: AdidasApiProduct[] = [];
	const allExtra30Products: AdidasApiProduct[] = [];
	let hasError: boolean = false;

	// 第一步：获取第一页以确定总商品数和获取首页产品
	console.log('正在获取第一页以确定总商品数...');
	try {
		const firstPageUrl = settings.adidas.apiUrl.replace('{StartIndex}', '0');
		const firstResponse = await fetch(firstPageUrl, {
			method: 'GET',
			headers: getBrowserHeaders(firstPageUrl),
		});

		if (!firstResponse.ok) {
			console.error('❌ 无法获取第一页数据');
			console.log(`firstResponse:`, firstResponse);
			return;
		}

		const firstPageData = (await firstResponse.json()) as AdidasApiResponse;
		const totalCount = firstPageData.pageProps.info.count;
		const viewSize = firstPageData.pageProps.info.viewSize;
		const firstPageProducts = firstPageData.pageProps.products;

		allProducts.push(...firstPageProducts);

		console.log(`📊 总商品数: ${totalCount}，每页 ${viewSize} 件`);

		// 计算需要抓取的页数
		const totalPages = Math.ceil(totalCount / viewSize);
		let pagesToFetch = totalPages;

		if (settings.isDebugMode) {
			pagesToFetch = Math.min(2, totalPages); // 调试模式只抓前2页
			console.log(`🔧 调试模式：限制为 ${pagesToFetch} 页`);
		}

		// 第二步：按顺序抓取剩余页面,每页随机间隔 3-7 秒
		if (pagesToFetch > 1) {
			console.log(`\n🚀 开始抓取第 2-${pagesToFetch} 页 (每页随机间隔 3-7 秒)...`);

			for (let pageIndex = 2; pageIndex <= pagesToFetch; pageIndex++) {
				const startIndex = (pageIndex - 1) * viewSize;

				console.log(`📄 正在抓取第 ${pageIndex}/${pagesToFetch} 页 (起始索引: ${startIndex})...`);

				const pageProducts = await fetchPage(settings.adidas.apiUrl, startIndex);

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

	// 抓取每个产品的 Extra 30 信息
	console.log('\n🚀 开始抓取每个产品的 Extra 30 详情...');

	try {
		const firstExtra30PageUrl = settings.adidas.apiExtra30ItemUrl.replace('{StartIndex}', '0');
		const firstExtra30Response = await fetch(firstExtra30PageUrl, {
			method: 'GET',
			headers: getBrowserHeaders(firstExtra30PageUrl),
		});

		if (!firstExtra30Response.ok) {
			console.error('❌ 无法获取Extra 30% 第一页数据');
			console.log(`firstExtra30Response:`, firstExtra30Response);
			return;
		}

		const firstExtra30PageData = (await firstExtra30Response.json()) as AdidasApiResponse;
		const totalCount = firstExtra30PageData.pageProps.info.count;
		const viewSize = firstExtra30PageData.pageProps.info.viewSize;
		const firstExtra30PageProducts = firstExtra30PageData.pageProps.products;

		allExtra30Products.push(...firstExtra30PageProducts);

		console.log(`📊 总商品数: ${totalCount}，每页 ${viewSize} 件`);

		// 计算需要抓取的页数
		const totalPages = Math.ceil(totalCount / viewSize);
		let pagesToFetch = totalPages;

		if (settings.isDebugMode) {
			pagesToFetch = Math.min(2, totalPages); // 调试模式只抓前2页
			console.log(`🔧 调试模式：限制为 ${pagesToFetch} 页`);
		}

		// 第二步：按顺序抓取剩余页面,每页随机间隔 3-7 秒
		if (pagesToFetch > 1) {
			console.log(`\n🚀 开始抓取第 2-${pagesToFetch} 页 (每页随机间隔 3-7 秒)...`);

			for (let pageIndex = 2; pageIndex <= pagesToFetch; pageIndex++) {
				const startIndex = (pageIndex - 1) * viewSize;

				console.log(`📄 正在抓取第 ${pageIndex}/${pagesToFetch} 页 (起始索引: ${startIndex})...`);

				const pageExtra30Products = await fetchPage(settings.adidas.apiExtra30ItemUrl, startIndex);

				if (pageExtra30Products.length === 0) {
					hasError = true;
					console.warn(`⚠️  第 ${pageIndex} 页抓取失败`);
				} else {
					allExtra30Products.push(...pageExtra30Products);
					console.log(`✅ 第 ${pageIndex} 页抓取成功,获得 ${pageExtra30Products.length} 个商品`);
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
		console.error('❌ 抓取 Extra 30% 过程中发生错误:', error);
		return;
	}

	console.log(`\n✅ Extra 30 信息抓取完成! 总共找到 ${allExtra30Products.length} 个有额外 30% 折扣的商品`);

	// 合并 Extra 30 商品到主商品列表
	// 1. 如果 Extra 30 商品在主列表中不存在,则添加到主列表
	// 2. 如果已存在,则标记为 Extra 30
	console.log('\n🔄 正在合并 Extra 30 商品列表...');
	const allProductsMap = new Map<string, AdidasApiProduct>();

	// 先将所有主商品添加到 Map
	for (const product of allProducts) {
		allProductsMap.set(product.id, product);
	}

	// 处理 Extra 30 商品
	let addedCount = 0;
	let markedCount = 0;

	for (const extra30Product of allExtra30Products) {
		if (allProductsMap.has(extra30Product.id)) {
			// 商品已存在,标记为 Extra 30
			allProductsMap.get(extra30Product.id)!.isExtra30Off = true;
			markedCount++;
		} else {
			// 商品不存在,添加到列表并标记为 Extra 30
			extra30Product.isExtra30Off = true;
			allProductsMap.set(extra30Product.id, extra30Product);
			addedCount++;
		}
	}

	console.log(`✅ 合并完成: 新增 ${addedCount} 个商品, 标记 ${markedCount} 个已有商品为 Extra 30%`);
	console.log(`📊 合并后总商品数: ${allProductsMap.size}`);

	// 转换为我们自己的产品格式并去重
	const uniqueProducts: Record<string, AdidasProduct> = {};

	for (const apiProduct of allProductsMap.values()) {
		const code = apiProduct.id;
		// 提取价格信息
		let price = 0;
		let originalPrice = 0;
		let discountPercentage = 0;

		const salePrice = apiProduct.priceData.prices.find((p) => p.type === 'sale');
		const origPrice = apiProduct.priceData.prices.find((p) => p.type === 'original');

		if (salePrice) {
			price = salePrice.value;
		}

		if (origPrice) {
			originalPrice = origPrice.value;
			discountPercentage = origPrice.discountPercentage || 0;
		}

		uniqueProducts[code] = {
			code: code,
			name: apiProduct.title,
			price: price ? price : originalPrice,
			originalPrice: originalPrice,
			discountPercentage: discountPercentage,
			url: `https://www.adidas.co.kr${apiProduct.url}`,
			imageUrl: apiProduct.image,
			subTitle: apiProduct.subTitle,
			isExtra30Off: apiProduct.isExtra30Off || false,
		};
	}

	console.log(`去重后共有 ${Object.keys(uniqueProducts).length} 个唯一商品`);

	// 保存到文件
	const dateNow: Date = new Date();
	const dateTimeString: string = getCurrentDateTimeString();
	const fileName: string = generateFileName(dateNow);

	// 保存最新数据到JSON文件
	const jsonFilePathAndName: string = getFilePath(E_BrandSite.Adidas, E_BrandOption.Adidas, fileName, 'json');

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

	await comparePrice(E_BrandSite.Adidas, E_BrandOption.Adidas, fileName);
}

/**
 * 计算到下一个整点+5分钟的毫秒数
 * @returns 距离下一个整点+5分钟的毫秒数
 */
function getMillisecondsUntilNextHourPlus5(): number {
	const now = new Date();
	const nextRun = new Date();

	// 设置为当前小时的5分钟
	nextRun.setMinutes(5);
	nextRun.setSeconds(0);
	nextRun.setMilliseconds(0);

	// 如果当前时间已经过了本小时的5分钟,则设置为下一个小时的5分钟
	if (now.getTime() >= nextRun.getTime()) {
		nextRun.setHours(nextRun.getHours() + 1);
	}

	const delay = nextRun.getTime() - now.getTime();

	const hours = Math.floor(delay / 3600000);
	const minutes = Math.floor((delay % 3600000) / 60000);
	const seconds = Math.floor((delay % 60000) / 1000);

	console.log(`⏰ 下次执行时间: ${nextRun.toLocaleString('zh-CN')} (${hours}小时${minutes}分${seconds}秒后)`);

	return delay;
}

/**
 * 计算到下一个指定时间的毫秒数 (UTC+9 时区的 9:05 或 10:05)
 * @returns 距离下一个执行时间的毫秒数
 */
function getMillisecondsUntilNext9or10Plus5KST(): number {
	const now = new Date();

	// 获取当前 UTC+9 (韩国时间) 的时间
	const nowKST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const kstHours = nowKST.getUTCHours();
	const kstMinutes = nowKST.getUTCMinutes();

	// 计算下一个执行时间 (UTC+9 时区)
	const nextRunKST = new Date(nowKST);
	nextRunKST.setUTCSeconds(0);
	nextRunKST.setUTCMilliseconds(0);

	// 设置为今天的 9:05 (KST)
	nextRunKST.setUTCHours(9);
	nextRunKST.setUTCMinutes(5);

	// 如果当前时间已经过了 9:05,尝试今天的 10:05
	if (kstHours > 9 || (kstHours === 9 && kstMinutes >= 5)) {
		nextRunKST.setUTCHours(10);
		nextRunKST.setUTCMinutes(5);
	}

	// 如果当前时间已经过了 10:05,则设置为明天的 9:05
	if (kstHours > 10 || (kstHours === 10 && kstMinutes >= 5)) {
		nextRunKST.setUTCDate(nextRunKST.getUTCDate() + 1);
		nextRunKST.setUTCHours(9);
		nextRunKST.setUTCMinutes(5);
	}

	// 转换回本地时间戳
	const nextRunLocal = new Date(nextRunKST.getTime() - 9 * 60 * 60 * 1000);
	const delay = nextRunLocal.getTime() - now.getTime();

	const hours = Math.floor(delay / 3600000);
	const minutes = Math.floor((delay % 3600000) / 60000);
	const seconds = Math.floor((delay % 60000) / 1000);

	// 显示韩国时间
	const kstTimeString = nextRunKST.toLocaleString('zh-CN', { timeZone: 'Asia/Seoul' });
	console.log(`⏰ 下次执行时间 (韩国时间 UTC+9): ${kstTimeString} (${hours}小时${minutes}分${seconds}秒后)`);

	return delay;
}

/**
 * 调度下一次执行
 */
function scheduleNextRun(): void {
	const delay = getMillisecondsUntilNext9or10Plus5KST();
	setTimeout(() => {
		scrapeAdidasProductsApi()
			.then(() => {
				console.log('\n✅ 脚本执行完成!');
				// 执行完成后,调度下一次执行
				scheduleNextRun();
			})
			.catch((error: Error) => {
				console.error('❌ 发生错误:', error);
				// 即使出错也要调度下一次执行
				scheduleNextRun();
			});
	}, delay);
}

/**
 * 运行 Adidas API 爬虫任务
 */
export async function runAdidasApiTask(eventOption: E_EventOptions): Promise<void> {
	if (eventOption === E_EventOptions.ApiModeScheduled) {
		console.log('🚀 正在启动 挂机 Adidas API 抓取任务...');
		console.log('📅 执行规则: 每天韩国时间(UTC+9) 09:05 和 10:05 执行');
		scheduleNextRun();
	} else {
		console.log('正在执行 Adidas API 任务...');
		scrapeAdidasProductsApi()
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
}
