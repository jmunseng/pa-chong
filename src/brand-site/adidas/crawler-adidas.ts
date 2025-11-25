import type { Page, Browser } from 'puppeteer';

import fs from 'fs';
import { connect } from 'puppeteer-real-browser';

import type { AdidasProduct, AdidasProductData, PageInfo } from '../../types/adidas-product';
import type { Settings } from '../../types/settings';

import { E_EventOptions, E_EventOptions_GetString } from '../../enum/enum-adidas';
import { E_BrandSite } from '../../enum/enum-brand-site';
import { E_BrandOption } from '../../enum/enum-musinsa';
import { getTotalPages, waitForProductGrid } from '../../utils/adidas/adidas';
import { generateExcel } from '../../utils/adidas/adidas-create-excel';
import { comparePrice, findPreviousJSONFile, generateFileName, getCurrentDateTimeString, getFilePath, loadSettings } from '../../utils/common';

/**
 * 抓取 Adidas 产品数据
 * @param e_eventOption - 活动选项 (默认为 Default)
 */
async function scrapeAdidasProducts(e_eventOption: E_EventOptions = E_EventOptions.Default): Promise<void> {
	console.log('启动真实浏览器...');

	// 使用puppeteer-real-browser，最强的反检测方案
	const { browser, page } = await connect({
		headless: false,
		args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
		turnstile: true, // 自动处理Cloudflare Turnstile
		customConfig: {},
		connectOption: {
			defaultViewport: null,
		},
		disableXvfb: true,
		ignoreAllFlags: false,
	});

	console.log('浏览器已启动');

	// 模拟人类行为：先访问主页
	console.log('先访问主页建立会话...');

	// 读取配置信息
	const settings: Settings = loadSettings();

	// 根据 e_eventOption 决定使用哪个 URL
	// e_eventOption: 0 = Default, 1 = BlackFriday
	let url: string = settings.adidas.url;
	if (e_eventOption === E_EventOptions.BlackFriday) {
		url = settings.adidas.blackFridayUrl;
		console.log('使用 Black Friday URL');
	} else {
		console.log('使用默认 URL');
	}
	console.log('现在访问目标页面...');

	await page.goto(url, {
		waitUntil: 'networkidle2',
		timeout: settings.CONFIG.PAGE_LOAD_TIMEOUT,
	});

	console.log('等待产品网格加载...');
	const isProductGridLoaded: boolean | undefined = await waitForProductGrid(page);
	if (!isProductGridLoaded) {
		console.log('❌ 产品网格加载失败');
		return;
	}

	console.log('开始提取产品信息...');

	// 多页抓取
	let allProducts: Record<string, AdidasProduct> = {}; // 改为对象,使用产品代码作为键
	let hasError: boolean = false;
	let pageNum: number = 1;
	const itemsPerPage: number = settings.adidas.itemPerPage;
	const pageInfo: PageInfo | null = await getTotalPages(page);

	// 检查是否有未完成的抓取任务
	const latestJSONFile: string | null = findPreviousJSONFile(E_BrandSite.Adidas, E_BrandOption.Adidas, null);

	if (latestJSONFile) {
		const lastFilePath: string = getFilePath(E_BrandSite.Adidas, E_BrandOption.Adidas, latestJSONFile.replace('.json', ''), 'json');
		const lastProductData: AdidasProductData = JSON.parse(fs.readFileSync(lastFilePath, 'utf-8'));

		if (lastProductData.hasError && lastProductData.errorPageNum) {
			console.log(`\n⚠️ 检测到上次抓取失败,从第 ${lastProductData.errorPageNum} 页继续抓取...`);
			pageNum = lastProductData.errorPageNum;
			allProducts = lastProductData.products || {};
		}
	} else {
		console.log(`\n✅ 未找到上次抓取失败的文件,这是首次运行,从第1页开始`);
	}

	// 检查 pageInfo 是否有效
	if (!pageInfo) {
		console.log('❌ 无法获取页面信息');
		return;
	}

	for (pageNum; pageNum <= pageInfo.total; pageNum++) {
		try {
			console.log(`\n正在抓取第 ${pageNum} 页...`);

			// 构建下一页URL
			const nextStart: number = (pageNum - 1) * itemsPerPage;
			const nextUrl: string = `${url}&start=${nextStart}`;

			console.log(`访问下一页: ${nextUrl}`);

			try {
				await page.goto(nextUrl, {
					waitUntil: 'networkidle2',
					timeout: settings.CONFIG.PAGE_LOAD_TIMEOUT,
				});
			} catch (err) {
				console.log(`❌ 无法加载下一页: ${(err as Error).message}`);
				hasError = true;
				break;
			}

			// 等待产品加载
			// console.log('等待产品网格加载...');
			const isProductGridLoaded: boolean | undefined = await waitForProductGrid(page);
			if (!isProductGridLoaded) {
				console.log('❌ 产品网格加载失败');
				hasError = true;
				break;
			}

			// 滚动页面以确保所有产品都被加载
			console.log('滚动页面以加载所有产品...');
			await page.evaluate(
				(scrollDistance: number, scrollInterval: number) => {
					return new Promise<void>((resolve) => {
						let totalHeight = 0;
						const distance = scrollDistance;
						const timer = setInterval(() => {
							// @ts-ignore - 浏览器环境中的 DOM API
							const scrollHeight = document.body.scrollHeight;
							// @ts-ignore - 浏览器环境中的 DOM API
							window.scrollBy(0, distance);
							totalHeight += distance;

							if (totalHeight >= scrollHeight) {
								clearInterval(timer);
								resolve();
							}
						}, scrollInterval);
					});
				},
				settings.CONFIG.SCROLL_DISTANCE,
				settings.CONFIG.SCROLL_INTERVAL
			);

			// 滚动后再等待一段时间让徽章加载
			await new Promise((resolve) => setTimeout(resolve, settings.CONFIG.BADGE_LOAD_WAIT));

			// 获取总页数信息
			console.log(`当前页: ${pageNum} / ${pageInfo.total}`);

			// 提取产品信息
			const products: Record<string, AdidasProduct> = await page.evaluate(
				(e_eventOption, blackFriday) => {
					// @ts-ignore - 浏览器环境中的 DOM API
					const productCards = document.querySelectorAll('[data-testid="plp-product-card"]');
					const productList: Record<string, any> = {}; // 使用对象来避免重复

					productCards.forEach((card: any) => {
						const link = card.querySelector('a[data-testid="product-card-description-link"]');
						const href = link?.getAttribute('href') || '';
						const codeMatch = href.match(/\/([A-Z0-9]+)\.html/);
						const code = codeMatch ? codeMatch[1] : '';
						// <p data-testid="product-card-badge" class="product-card-description_badge__m75SV">30% 추가 할인✨</p>
						const badgeElement = card.querySelector('p[data-testid="product-card-badge"]');
						const badgeText = badgeElement?.textContent || '';
						const isExtra30Off = badgeText.includes('30%');

						// 构建完整URL
						const url = href ? (href.startsWith('http') ? href : `https://www.adidas.co.kr${href}`) : '';

						const nameElement = card.querySelector('[data-testid="product-card-title"]');
						const name = nameElement?.textContent?.trim() || '';

						const priceElement = card.querySelector('[data-testid="main-price"] span:last-child');
						const priceText = priceElement?.textContent?.trim() || '';
						// 提取纯数字,移除逗号和"원"
						const priceMatch = priceText.match(/([\d,]+)/);
						const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

						// 获取产品图片URL
						const imageElement = card.querySelector('img[data-testid="product-card-primary-image"]');
						const imageUrl = imageElement?.getAttribute('src') || '';

						if (code && name && price && url) {
							productList[code] = {
								code,
								name,
								price,
								url,
								imageUrl,
								isExtra30Off: e_eventOption == blackFriday ? true : isExtra30Off,
							};
						}
					});

					return productList;
				},
				e_eventOption,
				E_EventOptions.BlackFriday
			);

			const productValues: AdidasProduct[] = Object.values(products);
			console.log(`第 ${pageNum} 页找到 ${productValues.length} 个产品`);

			// 显示前3个产品的徽章检测情况
			productValues.slice(0, 3).forEach((p: AdidasProduct, i: number) => {
				console.log(`  ${i + 1}. ${p.code} - ${p.name} - Extra 30%: ${p.isExtra30Off ? '✓' : '✗'}`);
			});

			// 合并产品对象
			allProducts = { ...allProducts, ...products };

			// debug: 限制只抓取2页
			if (settings.isDebugMode && pageNum == 2) {
				hasError = false;
				break;
			}

			// 检查是否还有下一页
			if (pageInfo && pageNum >= pageInfo.total) {
				console.log('已到达最后一页');
				break;
			}
		} catch (err) {
			// 捕获浏览器关闭或其他错误
			console.error(`❌ 抓取第 ${pageNum} 页时发生错误: ${(err as Error).message}`);
			hasError = true;
			break;
		}
	}

	// 由于allProducts现在是对象,键就是产品代码,已经自动去重了
	const uniqueProducts: Record<string, AdidasProduct> = allProducts;

	console.log(`\n总共提取 ${Object.keys(uniqueProducts).length} 个不重复的产品:\n`);

	// 保存到HTML文件
	const dateNow: Date = new Date();
	const dateTimeString: string = getCurrentDateTimeString();

	const fileName: string = generateFileName(dateNow);

	// 保存最新数据到JSON文件
	const jsonFilePathAndName: string = getFilePath(E_BrandSite.Adidas, E_BrandOption.Adidas, fileName, 'json');

	const jsonData: AdidasProductData = {
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

	// 关闭浏览器
	try {
		await browser.close();
		console.log('浏览器已关闭');
	} catch (err) {
		console.log(`浏览器已被关闭或无法关闭: ${(err as Error).message}`);
	}

	if (hasError) {
		// re-run whole process if not finished
		console.log('抓取未完成，准备重新运行爬虫...');
		await scrapeAdidasProducts(e_eventOption);
	} else {
		// 比较价格json data
		await comparePrice(E_BrandSite.Adidas, E_BrandOption.Adidas, fileName);

		// 生成 Excel 文件
		console.log(`准备生产Excel文件: ${fileName}.xlsx`);
		await generateExcel(E_BrandSite.Adidas, E_BrandOption.Adidas, fileName);
	}
}

/**
 * 运行 Adidas 爬虫任务
 * @param e_eventOption - 活动选项 (默认为 Default)
 */
export async function runAdidasTask(e_eventOption: E_EventOptions = E_EventOptions.Default): Promise<void> {
	console.log(`正在执行 Adidas ${E_EventOptions_GetString[e_eventOption] || '默认'} 任务...`);

	// 调用爬虫逻辑,传入 e_eventOption
	scrapeAdidasProducts(e_eventOption)
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
