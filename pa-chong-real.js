import { connect } from 'puppeteer-real-browser';
import fs from 'fs';
import {
	comparePrice,
	randomMouseMovement,
	findPreviousJSONFile,
} from './utils/adidas.js';

// async function waitForProductGrid(page) {
// 	// 首先检查页面上实际存在哪些元素
// 	console.log('🔍 调试: 检查页面上的 data-testid 属性...');
// 	const testIds = await page.evaluate(() => {
// 		const elements = document.querySelectorAll('[data-testid]');
// 		return Array.from(elements)
// 			.slice(0, 20) // 只取前20个,避免输出过多
// 			.map((el) => el.getAttribute('data-testid'));
// 	});
// 	console.log('📋 找到的 data-testid (前20个):', testIds);

// 	// 检查页面上是否有包含 "product" 关键字的 class 或 data 属性
// 	console.log('🔍 调试: 检查包含 "product" 的元素...');
// 	const productElements = await page.evaluate(() => {
// 		const selectors = [
// 			'[class*="product"]',
// 			'[data-auto-id*="product"]',
// 			'[id*="product"]',
// 		];
// 		const results = {};
// 		for (const selector of selectors) {
// 			const elements = document.querySelectorAll(selector);
// 			if (elements.length > 0) {
// 				results[selector] = {
// 					count: elements.length,
// 					firstClasses: elements[0].className,
// 				};
// 			}
// 		}
// 		return results;
// 	});
// 	console.log('📋 包含 "product" 的元素:', productElements);

// 	const candidateSelectors = [
// 		'[data-testid="plp-product-card"]',
// 		'[data-testid="product-grid"]',
// 		'[data-testid="product-grid-container"]',
// 		'main [data-auto-id="products-list"]',
// 	];

// 	for (const selector of candidateSelectors) {
// 		try {
// 			console.log(`⏳ 尝试等待选择器: ${selector}`);
// 			await page.waitForSelector(selector, {
// 				timeout: 20000,
// 			});
// 			console.log(`✅ 通过选择器 ${selector} 检测到产品容器`);
// 			return;
// 		} catch {
// 			console.log(`⚠️ 未检测到 ${selector}, 尝试下一个候选...`);
// 		}
// 	}

// 	console.log('⚠️ 产品容器候选未出现,滚动页面触发懒加载...');
// 	await page.evaluate(() => {
// 		window.scrollTo(0, document.body.scrollHeight);
// 	});
// 	await page.waitForTimeout(1500);

// 	try {
// 		console.log('⏳ 等待产品卡片出现...');
// 		await page.waitForFunction(
// 			() =>
// 				document.querySelectorAll('[data-testid="plp-product-card"]')
// 					.length > 0,
// 			{ timeout: 20000 }
// 		);
// 		console.log('✅ 滚动后检测到产品卡片');
// 		await page.evaluate(() => {
// 			window.scrollTo(0, 0);
// 		});
// 	} catch {
// 		console.log('❌ 滚动后仍未检测到产品,继续执行流程以便调试');

// 		// 最后的调试信息:检查页面上实际有哪些元素
// 		const finalDebug = await page.evaluate(() => {
// 			return {
// 				bodyHTML: document.body.innerHTML.substring(0, 500), // 前500字符
// 				allDivs: document.querySelectorAll('div').length,
// 				allArticles: document.querySelectorAll('article').length,
// 				allSections: document.querySelectorAll('section').length,
// 			};
// 		});
// 		console.log('📋 页面元素统计:', finalDebug);
// 	}
// }

async function handleBlockingOverlays(page) {
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
			await handle.click({ delay: 100 });
			console.log(`✅ 已关闭遮挡元素 ${selector}`);
			await page.waitForTimeout(400);
		} catch (error) {
			console.log(`⚠️ 点击遮挡元素 ${selector} 失败: ${error.message}`);
		}
	}
}

async function waitForProductGrid(page) {
	const candidateSelectors = [
		'[data-testid="plp-product-card"]',
		'[data-testid="product-grid"]',
		'[data-testid="product-grid-container"]',
		'main [data-auto-id="products-list"]',
	];
	const retryLimit = 3;

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
				return (
					style &&
					style.display !== 'none' &&
					style.visibility !== 'hidden'
				);
			});
		}, candidateSelectors);

		if (alreadyPresent) {
			console.log('✅ 页面加载时已检测到产品容器');
			return;
		}

		for (const selector of candidateSelectors) {
			try {
				await page.waitForSelector(selector, {
					timeout: 20000,
					visible: true,
				});
				console.log(`✅ 通过选择器 ${selector} 检测到产品容器`);
				return;
			} catch {
				console.log(`⚠️ 未检测到 ${selector}, 尝试下一个候选...`);
			}
		}

		console.log('⚠️ 产品容器候选未出现,滚动页面触发懒加载...');
		await page.evaluate(() => {
			window.scrollTo(0, document.body.scrollHeight);
		});
		await page.waitForTimeout(1500);
		await handleBlockingOverlays(page);

		try {
			await page.waitForFunction(
				() =>
					document.querySelectorAll(
						'[data-testid="plp-product-card"]'
					).length > 0,
				{ timeout: 15000 }
			);
			console.log('✅ 滚动后检测到产品卡片');
			await page.evaluate(() => {
				window.scrollTo(0, 0);
			});
			return;
		} catch {
			console.log('⚠️ 滚动后仍未检测到产品,准备重试');
		}

		if (attempt < retryLimit) {
			console.log('🔄 重新加载页面后再次尝试...');
			await page.reload({
				waitUntil: 'domcontentloaded',
				timeout: 60000,
			});
		}
	}

	console.log('❌ 多次尝试后仍未检测到产品容器,继续执行流程以便调试');
}

async function scrapeAdidasProducts() {
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

	// // 随机等待
	// await new Promise((resolve) =>
	// 	setTimeout(resolve, 3000 + Math.random() * 2000)
	// );

	// 访问目标网页
	const url = 'https://www.adidas.co.kr/outlet?grid=true';
	console.log('现在访问目标页面...');

	await page.goto(url, {
		waitUntil: 'networkidle2',
		timeout: 60000,
	});

	console.log('等待产品网格加载...');
	await waitForProductGrid(page);

	console.log('开始提取产品信息...');

	// 多页抓取
	let allProducts = {}; // 改为对象,使用产品代码作为键
	let pageNum = 1;
	const itemsPerPage = 48;

	while (true) {
		console.log(`\n正在抓取第 ${pageNum} 页...`);

		// 等待产品加载
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// 滚动前先模拟鼠标移动
		await randomMouseMovement(page);

		// 滚动页面以确保所有产品都被加载
		console.log('滚动页面以加载所有产品...');
		await page.evaluate(() => {
			return new Promise((resolve) => {
				let totalHeight = 0;
				const distance = 100;
				const timer = setInterval(() => {
					const scrollHeight = document.body.scrollHeight;
					window.scrollBy(0, distance);
					totalHeight += distance;

					if (totalHeight >= scrollHeight) {
						clearInterval(timer);
						resolve();
					}
				}, 100);
			});
		});

		// 滚动后再等待一段时间让徽章加载
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// 回到顶部
		// await page.evaluate(() => {
		// 	window.scrollTo(0, 0);
		// });

		// 获取总页数信息
		const pageInfo = await page.evaluate(() => {
			const indicator = document.querySelector(
				'[data-testid="page-indicator"]'
			);
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

		if (pageInfo) {
			console.log(`当前页: ${pageInfo.current} / ${pageInfo.total}`);
		}

		// 提取产品信息
		const products = await page.evaluate(() => {
			const productCards = document.querySelectorAll(
				'[data-testid="plp-product-card"]'
			);
			const productList = {}; // 使用对象来避免重复

			productCards.forEach((card) => {
				const link = card.querySelector(
					'a[data-testid="product-card-description-link"]'
				);
				const href = link?.getAttribute('href') || '';
				const codeMatch = href.match(/\/([A-Z0-9]+)\.html/);
				const code = codeMatch ? codeMatch[1] : '';
				// <p data-testid="product-card-badge" class="product-card-description_badge__m75SV">30% 추가 할인✨</p>
				const badgeElement = card.querySelector(
					'p[data-testid="product-card-badge"]'
				);
				const badgeText = badgeElement?.textContent || '';
				const isExtra30Off = badgeText.includes('30%');

				// 构建完整URL
				const url = href
					? href.startsWith('http')
						? href
						: `https://www.adidas.co.kr${href}`
					: '';

				const nameElement = card.querySelector(
					'[data-testid="product-card-title"]'
				);
				const name = nameElement?.textContent?.trim() || '';

				const priceElement = card.querySelector(
					'[data-testid="main-price"] span:last-child'
				);
				const price = priceElement?.textContent?.trim() || '';

				// 获取产品图片URL
				const imageElement = card.querySelector(
					'img[data-testid="product-card-primary-image"]'
				);
				const imageUrl = imageElement?.getAttribute('src') || '';

				if (code && name && price && url) {
					productList[code] = {
						code,
						name,
						price,
						url,
						imageUrl,
						isExtra30Off: isExtra30Off,
					};
				}
			});

			return productList;
		});

		const productValues = Object.values(products);
		console.log(`第 ${pageNum} 页找到 ${productValues.length} 个产品`);

		// 显示前15个产品的徽章检测情况
		productValues.slice(0, 15).forEach((p, i) => {
			console.log(
				`  ${i + 1}. ${p.code} - ${p.name} - Extra 30%: ${p.isExtra30Off ? '✓' : '✗'}`
			);
		});

		// 合并产品对象
		allProducts = { ...allProducts, ...products };

		// 检查是否还有下一页
		// if (pageInfo && pageNum >= pageInfo.total) {
		// <<<<
		if (pageInfo && pageInfo.current >= 3) {
			console.log('已到达最后一页');
			break;
		}

		// 构建下一页URL
		pageNum++;
		const nextStart = (pageNum - 1) * itemsPerPage;
		const nextUrl = `https://www.adidas.co.kr/outlet?grid=true&start=${nextStart}`;

		console.log(`访问下一页: ${nextUrl}`);

		try {
			await page.goto(nextUrl, {
				waitUntil: 'networkidle2',
				timeout: 60000,
			});
		} catch (err) {
			console.log('无法加载下一页:', err.message);
			break;
		}
	}

	// 由于allProducts现在是对象,键就是产品代码,已经自动去重了
	const uniqueProducts = allProducts;

	console.log(
		`\n总共提取 ${Object.keys(uniqueProducts).length} 个不重复的产品:\n`
	);

	// 保存到HTML文件
	const today = new Date();
	const dateTimeString = today.toLocaleString('ko-KR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
	const collectionFolder = 'collection';
	if (!fs.existsSync(collectionFolder)) {
		fs.mkdirSync(collectionFolder);
	}
	const fileName = `${collectionFolder}/adidas-extra-sale-products_${today.getFullYear()}-${String(
		today.getMonth() + 1
	).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${String(
		today.getHours()
	).padStart(2, '0')}-${String(today.getMinutes()).padStart(2, '0')}-${String(
		today.getSeconds()
	).padStart(2, '0')}`;

	// 保存最新数据到JSON文件
	const jsonFileName = `${fileName}.json`;
	// uniqueProducts 现在已经是对象格式了,不需要转换

	const jsonData = {
		dateTimeString: dateTimeString,
		timestamp: today.toISOString(),
		totalProducts: Object.keys(uniqueProducts).length,
		products: uniqueProducts,
	};

	console.log(`保存最新数据到 JSON 文件: ${jsonFileName}`);
	fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2), 'utf-8');
	console.log('JSON 文件保存成功');

	// 查找之前的JSON文件
	const prevFileName = findPreviousJSONFile(fileName);

	// 比较价格json data
	await comparePrice(fileName, prevFileName);

	// 关闭浏览器
	await browser.close();
	console.log('浏览器已关闭');

	return;
}

// 运行脚本
scrapeAdidasProducts()
	.then(() => {
		console.log('\n脚本执行完成!');
		setTimeout(() => {
			process.exit(0);
		}, 1000);
	})
	.catch((error) => {
		console.error('发生错误:', error);
		process.exit(1);
	});
