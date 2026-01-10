import * as cheerio from 'cheerio';
import fs from 'fs';

import type { LululemonProduct, LululemonProductData } from '../../types/lululemon-product';
import type { Settings } from '../../types/settings';

import { E_BrandSite } from '../../enum/enum-brand-site';
import { E_BrandOption } from '../../enum/enum-musinsa';
import { comparePrice, generateFileName, getCurrentDateTimeString, getFilePath, loadSettings } from '../../utils/common';

/**
 * 从图片 URL 中提取产品代码
 * 例如: "https://images.lululemon.com/is/image/lululemon/LM3FG2S_060163_1?size=800,800" -> "LM3FG2S"
 */
function extractProductCode(imageUrl: string): string {
	const match = imageUrl.match(/\/([A-Z0-9]+)_\d+_\d+\?/);
	return match ? match[1] : '';
}

/**
 * 抓取 Lululemon 产品数据
 */
async function scrapeLululemonProducts(): Promise<void> {
	const settings: Settings = loadSettings();

	let hasError: boolean = false;
	let errorPageNum: number = 0;
	const uniqueProducts: Record<string, LululemonProduct> = {};

	let currentPage: number = 0;

	// 每次请求 100 个产品
	const pageSize: number = 100;

	console.log('开始抓取 Lululemon 产品数据...\n');

	// 初始化浏览器 (在循环外部,复用同一个浏览器实例)
	const connect = await import('puppeteer-real-browser');
	const { browser, page } = await connect.connect({
		headless: false,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	try {
		// 先访问首页建立会话
		console.log('访问首页建立会话...');
		await page.goto('https://www.lululemon.co.kr/', {
			waitUntil: 'networkidle2',
			timeout: 30000,
		});
		console.log('等待 3 秒...');
		await new Promise((r) => setTimeout(r, 3000));
		console.log('会话建立完成\n');

		while (true) {
			const startIndex: number = currentPage * pageSize;

			// 构造 URL
			const womenAllApiUrl = settings.lululemon.womenAllApiUrl
				.replace('{StartIndex}', startIndex.toString())
				.replace('{Size}', pageSize.toString());

			console.log('apiUrl:', womenAllApiUrl);
			console.log(`正在抓取第 ${currentPage + 1} 页 (start=${startIndex}, size=${pageSize})...`);

			try {
				await page.goto(womenAllApiUrl, {
					waitUntil: 'networkidle2',
					timeout: 30000,
				});

				const html = await page.content();

				const $ = cheerio.load(html);

				// 解析产品
				const products = $('.product[data-pid]');

				if (products.length === 0) {
					console.log(`第 ${currentPage + 1} 页没有产品，抓取完成`);
					break;
				}

				console.log(`第 ${currentPage + 1} 页找到 ${products.length} 个产品`);

				// 调试模式：只抓取前2页
				if (settings.isDebugMode && currentPage >= 1) {
					console.log(`🔧 调试模式：已抓取 ${currentPage + 1} 页，停止抓取`);
					break;
				}

				products.each((_, element) => {
					const $product = $(element);

					// 提取产品信息
					const productId = $product.attr('data-pid') || '';
					const name = $product.find('.pdp-link .link').text().trim();

					// 从 .image-container > a 获取产品链接
					const url = $product.find('.image-container > a').attr('href') || '';

					// 从 data-srcset 提取产品代码 (优先使用 data-srcset,因为它包含高清图)
					// 例如: "https://images.lululemon.com/is/image/lululemon/LM3FG2S_060163_1?size=800,800 2x"
					const imageSrcsetRaw = $product.find('.image-container source[media="(min-width:768px)"]').attr('data-srcset') || '';
					// 去掉末尾的 " 2x" 或其他描述符
					const imageSrcset = imageSrcsetRaw.split(' ')[0];
					const imageUrl = $product.find('.tile-image.default-image').attr('data-src') || '';

					// 从 data-srcset 或 data-src 提取产品代码
					const code = extractProductCode(imageSrcset || imageUrl);

					// 提取价格 - 从 .sales .value 的 content 属性
					const salePriceStr = $product.find('.sales .value').attr('content') || '0';
					const listPriceStr = $product.find('.strike-through.list .value').attr('content') || '0';

					const price = Number.parseInt(salePriceStr, 10) || 0;
					const originalPrice = Number.parseInt(listPriceStr, 10) || 0;

					// 提取颜色信息
					const colorCode = $product.find('.swatchAnchor[aria-selected="true"]').attr('data-color-code') || '';
					const colorName = $product.find('.swatchAnchor[aria-selected="true"]').attr('title') || '';

					if (code && name && price > 0) {
						const product: LululemonProduct = {
							code,
							name,
							price,
							url: url.startsWith('http') ? url : `https://www.lululemon.co.kr${url}`,
							imageUrl: imageSrcset || imageUrl, // 优先使用高清图 URL
							originalPrice: originalPrice > 0 ? originalPrice : undefined,
							productId,
							colorCode: colorCode || undefined,
							colorName: colorName || undefined,
						};

						uniqueProducts[code] = product;
					}
				});

				console.log(`当前总产品数: ${Object.keys(uniqueProducts).length}\n`);

				// 稍微等待一下，防止请求太快
				await new Promise((r) => setTimeout(r, 2000));

				currentPage++;

				// 如果返回的产品数少于请求的数量，说明已经到最后一页
				if (products.length < pageSize) {
					console.log('已到达最后一页');
					break;
				}
			} catch (error) {
				console.error(`第 ${currentPage + 1} 页抓取出错:`, error);
				hasError = true;
				errorPageNum = currentPage + 1;
				break;
			}
		}

		// ========== 开始抓取特卖区产品 ==========
		console.log('\n========== 开始抓取特卖区产品 ==========\n');
		currentPage = 0;

		while (true) {
			const startIndex: number = currentPage * pageSize;

			// 构造特卖区 URL
			const saleApiUrl = settings.lululemon.saleApiUrl
				.replace('{StartIndex}', startIndex.toString())
				.replace('{Size}', pageSize.toString());

			console.log('特卖区 apiUrl:', saleApiUrl);
			console.log(`正在抓取特卖区第 ${currentPage + 1} 页 (start=${startIndex}, size=${pageSize})...`);

			try {
				await page.goto(saleApiUrl, {
					waitUntil: 'networkidle2',
					timeout: 30000,
				});

				const html = await page.content();

				const $ = cheerio.load(html);

				// 解析产品
				const products = $('.product[data-pid]');

				if (products.length === 0) {
					console.log(`特卖区第 ${currentPage + 1} 页没有产品，抓取完成`);
					break;
				}

				console.log(`特卖区第 ${currentPage + 1} 页找到 ${products.length} 个产品`);

				// 调试模式：只抓取前2页
				if (settings.isDebugMode && currentPage >= 1) {
					console.log(`🔧 调试模式：已抓取特卖区 ${currentPage + 1} 页，停止抓取`);
					break;
				}

				products.each((_, element) => {
					const $product = $(element);

					// 提取产品信息
					const productId = $product.attr('data-pid') || '';
					const name = $product.find('.pdp-link .link').text().trim();

					// 从 .image-container > a 获取产品链接
					const url = $product.find('.image-container > a').attr('href') || '';

					// 从 data-srcset 提取产品代码 (优先使用 data-srcset,因为它包含高清图)
					const imageSrcsetRaw = $product.find('.image-container source[media="(min-width:768px)"]').attr('data-srcset') || '';
					// 去掉末尾的 " 2x" 或其他描述符
					const imageSrcset = imageSrcsetRaw.split(' ')[0];
					const imageUrl = $product.find('.tile-image.default-image').attr('data-src') || '';

					// 从 data-srcset 或 data-src 提取产品代码
					const code = extractProductCode(imageSrcset || imageUrl);

					// 提取价格 - 从 .sales .value 的 content 属性
					const salePriceStr = $product.find('.sales .value').attr('content') || '0';
					const listPriceStr = $product.find('.strike-through.list .value').attr('content') || '0';

					const price = Number.parseInt(salePriceStr, 10) || 0;
					const originalPrice = Number.parseInt(listPriceStr, 10) || 0;

					// 提取颜色信息
					const colorCode = $product.find('.swatchAnchor[aria-selected="true"]').attr('data-color-code') || '';
					const colorName = $product.find('.swatchAnchor[aria-selected="true"]').attr('title') || '';

					if (code && name && price > 0) {
						const product: LululemonProduct = {
							code,
							name,
							price,
							url: url.startsWith('http') ? url : `https://www.lululemon.co.kr${url}`,
							imageUrl: imageSrcset || imageUrl, // 优先使用高清图 URL
							originalPrice: originalPrice > 0 ? originalPrice : undefined,
							productId,
							colorCode: colorCode || undefined,
							colorName: colorName || undefined,
						};

						uniqueProducts[code] = product;
					}
				});

				console.log(`当前总产品数: ${Object.keys(uniqueProducts).length}\n`);

				// 稍微等待一下，防止请求太快
				await new Promise((r) => setTimeout(r, 2000));

				currentPage++;

				// 如果返回的产品数少于请求的数量，说明已经到最后一页
				if (products.length < pageSize) {
					console.log('特卖区已到达最后一页');
					break;
				}
			} catch (error) {
				console.error(`特卖区第 ${currentPage + 1} 页抓取出错:`, error);
				hasError = true;
				errorPageNum = currentPage + 1;
				break;
			}
		}
	} catch (error) {
		console.error('抓取过程出错:', error);
		hasError = true;
	} finally {
		// 确保浏览器关闭
		await browser.close();
		console.log('浏览器已关闭');
	}

	console.log(`\n抓取完成! 总共抓取到 ${Object.keys(uniqueProducts).length} 个唯一产品`);

	// 保存到JSON文件
	const dateNow: Date = new Date();
	const dateTimeString: string = getCurrentDateTimeString();
	const fileName: string = generateFileName(dateNow);

	const jsonFilePathAndName: string = getFilePath(E_BrandSite.Lululemon, E_BrandOption.Lululemon, fileName, 'json');

	const jsonData: LululemonProductData = {
		dateTimeString: dateTimeString,
		timestamp: dateNow.toISOString(),
		hasError: hasError,
		errorPageNum: hasError ? errorPageNum : undefined,
		totalProducts: Object.keys(uniqueProducts).length,
		products: uniqueProducts,
	};

	console.log(`保存最新数据到 JSON 文件: ${jsonFilePathAndName}`);
	fs.writeFileSync(jsonFilePathAndName, JSON.stringify(jsonData, null, 2), 'utf-8');
	console.log('JSON 文件保存成功');

	await comparePrice(E_BrandSite.Lululemon, E_BrandOption.Lululemon, fileName);
}

/**
 * 运行 Lululemon 爬虫任务
 */
export async function runLululemonApiTask(): Promise<void> {
	console.log(`正在执行 Lululemon 爬虫任务`);

	// 调用爬虫逻辑
	scrapeLululemonProducts()
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
