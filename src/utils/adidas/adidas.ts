import fs from 'fs';

import type { E_BrandSite } from '../../enum/enum-brand-site';
import type { E_BrandOption } from '../../enum/enum-musinsa';
import type { AdidasProduct, AdidasProductData, AdidasRemovedProduct, PageInfo } from '../../types/adidas-product';
import type { Settings } from '../../types/settings';

import { getFilePath, loadSettings } from '../common';
import { generateAdidasHTMLContent } from './adidas-generate-html';

/**
 * 处理阻挡页面的遮罩层
 * @param page - Puppeteer 页面对象 (兼容 puppeteer-real-browser 的 PageWithCursor)
 */
async function handleBlockingOverlays(page: any): Promise<void> {
	const settings: Settings = loadSettings();
	const dismissSelectors: string[] = [
		'#onetrust-accept-btn-handler',
		'button[data-testid="cookie-policy-accept"]',
		'button[data-testid="cookie-policy-accept-button"]',
		'button[data-testid="cookie-accept-all"]',
		'button[data-testid="dialog-close-button"]',
	];
	for (const selector of dismissSelectors) {
		const handle = await page.$(selector);
		if (!handle) {
			continue;
		}
		try {
			await handle.click({ delay: settings.CONFIG.CLICK_DELAY });
			console.log(`✅ 已关闭遮挡元素 ${selector}`);
			await new Promise((resolve) => setTimeout(resolve, settings.CONFIG.OVERLAY_DISMISS_TIMEOUT));
		} catch (error) {
			console.log(`⚠️ 点击遮挡元素 ${selector} 失败: ${(error as Error).message}`);
		}
	}
}

/**
 * 等待产品网格加载
 * @param page - Puppeteer 页面对象 (兼容 puppeteer-real-browser 的 PageWithCursor)
 * @returns 是否成功加载产品网格
 */
export async function waitForProductGrid(page: any): Promise<boolean | undefined> {
	const settings: Settings = loadSettings();
	const candidateSelectors: string[] = [
		'[data-testid="plp-product-card"]',
		'[data-testid="product-grid"]',
		'[data-testid="product-grid-container"]',
		'main [data-auto-id="products-list"]',
	];
	const retryLimit: number = 1;

	for (let attempt: number = 1; attempt <= retryLimit; attempt += 1) {
		console.log(`⏳ 第 ${attempt} 次尝试定位产品网格...`);
		await handleBlockingOverlays(page);

		const alreadyPresent: boolean = await page.evaluate((selectors: string[]) => {
			return selectors.some((selector) => {
				// @ts-ignore - 浏览器环境中的 DOM API
				const element = document.querySelector(selector);
				if (!element) {
					return false;
				}
				// @ts-ignore - 浏览器环境中的 DOM API
				const style = window.getComputedStyle(element);
				return style && style.display !== 'none' && style.visibility !== 'hidden';
			});
		}, candidateSelectors);

		if (alreadyPresent) {
			console.log('✅ 页面加载时已检测到产品容器');
			return true;
		}

		for (const selector of candidateSelectors) {
			try {
				await page.waitForSelector(selector, {
					timeout: settings.CONFIG.SELECTOR_TIMEOUT,
					visible: true,
				});
				console.log(`✅ 通过选择器 ${selector} 检测到产品容器`);
				return true;
			} catch {
				console.log(`⚠️ 未检测到 ${selector}, 尝试下一个候选...`);
			}
		}

		console.log('⚠️ 产品容器候选未出现,滚动页面触发懒加载...');
		await page.evaluate(() => {
			// @ts-ignore - 浏览器环境中的 DOM API
			window.scrollTo(0, document.body.scrollHeight);
		});

		// 智能等待:监听网络空闲状态,而不是固定等待15秒
		try {
			await page.waitForNetworkIdle({ idleTime: 500, timeout: settings.CONFIG.SCROLL_CHECK_TIMEOUT });
			console.log('✅ 网络空闲,懒加载完成');
		} catch {
			console.log('⚠️ 等待超时,继续执行');
		}
		await handleBlockingOverlays(page);

		try {
			await page.waitForFunction(
				() => {
					// @ts-ignore - 浏览器环境中的 DOM API
					return document.querySelectorAll('[data-testid="plp-product-card"]').length > 0;
				},
				{ timeout: 15000 }
			);
			console.log('✅ 滚动后检测到产品卡片');
			await page.evaluate(() => {
				// @ts-ignore - 浏览器环境中的 DOM API
				window.scrollTo(0, 0);
			});
			return true;
		} catch {
			console.log('⚠️ 滚动后仍未检测到产品,准备重试');
		}

		if (attempt < retryLimit) {
			console.log('🔄 重新加载页面后再次尝试...');
			await page.reload({
				waitUntil: 'domcontentloaded',
				timeout: settings.CONFIG.PAGE_LOAD_TIMEOUT,
			});
		}
	}

	console.log('❌ 多次尝试后仍未检测到产品容器,继续执行流程以便调试');
}

/**
 * 获取总页数信息
 * @param page - Puppeteer 页面对象 (兼容 puppeteer-real-browser 的 PageWithCursor)
 * @returns 页面信息对象,包含当前页和总页数
 */
export async function getTotalPages(page: any): Promise<PageInfo | null> {
	return await page.evaluate(() => {
		// @ts-ignore - 浏览器环境中的 DOM API
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

/**
 * 比较 Adidas 产品价格
 * @param e_brandSite - 品牌网站
 * @param e_brandOption - 品牌选项
 * @param previousProductData - 之前的产品数据
 * @param currentProductData - 当前产品数据
 * @param fileName - 文件名(不含扩展名)
 * @param prevFileName - 之前的文件名
 */
export function comparePriceAdidas(
	e_brandSite: E_BrandSite,
	e_brandOption: E_BrandOption,
	previousProductData: AdidasProductData,
	currentProductData: AdidasProductData,
	fileName: string,
	prevFileName: string
): void {
	if (previousProductData) {
		console.log(`从 ${prevFileName} 中提取了 ${Object.keys(previousProductData.products).length} 个产品`);
		console.log('\n开始比较价格...');

		let priceDropCount: number = 0;
		// 标记降价产品 - 比较当前抓取的数据与最新已保存文件的价格
		Object.values(currentProductData.products).forEach((product: AdidasProduct, index: number) => {
			// 兼容新旧数据格式: 价格可能是数字或字符串 "71,200 원"
			const currentPrice: number =
				typeof product.price === 'number'
					? product.price
					: (() => {
							const priceMatch = String(product.price).match(/([\d,]+)\s*원/);
							return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
						})();

			const previousProductInfo: AdidasProduct | undefined = previousProductData.products[product.code];
			const previousPrice: number | null = previousProductInfo?.price
				? typeof previousProductInfo.price === 'number'
					? previousProductInfo.price
					: (() => {
							const priceMatch = String(previousProductInfo.price).match(/([\d,]+)\s*원/);
							return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
						})()
				: null;
			const previousIsExtra30Off = previousProductInfo?.isExtra30Off || false;

			// 调试日志 - 只显示前5个产品
			// if (index < 5) {
			// 	console.log(`\n产品 ${index + 1}: ${product.code} - ${product.name}`);
			// 	console.log(`  当前价格: ${currentPrice.toLocaleString()}`);
			// 	console.log(`  之前价格: ${previousPrice ? previousPrice.toLocaleString() : '未找到'}`);
			// 	console.log(`  价格下降: ${previousPrice && currentPrice < previousPrice ? '是' : '否'}`);
			// }

			if (!previousPrice) {
				// 新产品
				product.isNewItem = true;
				// console.log(`✓ 新产品: ${product.code} - ${product.name}: ${currentPrice.toLocaleString()} 원`);
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
		const removedProducts: AdidasRemovedProduct[] = [];
		const currentCodes: Set<string> = new Set(Object.keys(currentProductData.products));
		Object.entries(previousProductData.products).forEach(([code, productInfo]: [string, AdidasProduct]) => {
			if (!currentCodes.has(code)) {
				removedProducts.push({
					code: code,
					price: productInfo.price,
				});
				// console.log(`✓ 已下架: ${code}: ${productInfo.price}`);
			}
		});

		// 统计摘要
		const uniqueProducts: AdidasProduct[] = Object.values(currentProductData.products);
		const newItemCount: number = uniqueProducts.filter((p: AdidasProduct) => p.isNewItem).length;
		const priceIncreaseCount: number = uniqueProducts.filter((p: AdidasProduct) => p.isPriceIncreased).length;

		console.log(`\n=== 价格比较摘要 ===`);
		console.log(`价格下降: ${priceDropCount} 件`);
		console.log(`价格上涨: ${priceIncreaseCount} 件`);
		console.log(`新产品: ${newItemCount} 件`);
		console.log(`已下架: ${removedProducts.length} 件`);
		console.log(`==================\n`);

		// 直接从JSON数据中获取日期时间字符串,不需要从文件名解析
		const previousDateTimeString: string = previousProductData.dateTimeString;
		const dateTimeString: string = currentProductData.dateTimeString;

		// 重新生成HTML，包含价格比较信息
		const htmlContentWithComparison: string = generateAdidasHTMLContent(uniqueProducts, dateTimeString, previousDateTimeString, removedProducts);
		const htmlFilePathAndName: string = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContentWithComparison, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName} (包含价格比较)`);
	} else {
		console.log('无法从之前的文件中提取价格信息');
		const uniqueProducts: AdidasProduct[] = Object.values(currentProductData.products);
		const dateTimeString: string = currentProductData.dateTimeString;
		const htmlContent: string = generateAdidasHTMLContent(uniqueProducts, dateTimeString);
		const htmlFilePathAndName: string = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContent, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName}`);
	}
}
