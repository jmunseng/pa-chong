import { loadSettings } from '../common.js';

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
