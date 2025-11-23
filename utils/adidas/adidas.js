import fs from 'fs';
import { getFilePath, loadSettings } from '../common.js';
import { generateAdidasHTMLContent } from './adidas-generate-html.js';

async function handleBlockingOverlays(page) {
	const settings = loadSettings();
	const dismissSelectors = [
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
			await page.waitForTimeout(settings.CONFIG.OVERLAY_DISMISS_TIMEOUT);
		} catch (error) {
			console.log(`⚠️ 点击遮挡元素 ${selector} 失败: ${error.message}`);
		}
	}
}

export async function waitForProductGrid(page) {
	const settings = loadSettings();
	const candidateSelectors = [
		'[data-testid="plp-product-card"]',
		'[data-testid="product-grid"]',
		'[data-testid="product-grid-container"]',
		'main [data-auto-id="products-list"]',
	];
	const retryLimit = 1;

	for (let attempt = 1; attempt <= retryLimit; attempt += 1) {
		console.log(`⏳ 第 ${attempt} 次尝试定位产品网格...`);
		await handleBlockingOverlays(page);

		const alreadyPresent = await page.evaluate((selectors) => {
			return selectors.some((selector) => {
				const element = document.querySelector(selector);
				if (!element) {
					return false;
				}
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
			await page.waitForFunction(() => document.querySelectorAll('[data-testid="plp-product-card"]').length > 0, { timeout: 15000 });
			console.log('✅ 滚动后检测到产品卡片');
			await page.evaluate(() => {
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

export function comparePriceAdidas(e_brandSite, e_brandOption, previousProductData, currentProductData, fileName, prevFileName) {
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
		const htmlContentWithComparison = generateAdidasHTMLContent(uniqueProducts, dateTimeString, previousDateTimeString, removedProducts);
		const htmlFilePathAndName = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContentWithComparison, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName} (包含价格比较)`);
	} else {
		console.log('无法从之前的文件中提取价格信息');
		const uniqueProducts = Object.values(currentProductData.products);
		const dateTimeString = currentProductData.dateTimeString;
		const htmlContent = generateAdidasHTMLContent(uniqueProducts, dateTimeString);
		const htmlFilePathAndName = getFilePath(e_brandSite, e_brandOption, fileName, 'html');
		fs.writeFileSync(htmlFilePathAndName, htmlContent, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFilePathAndName}`);
	}
}
