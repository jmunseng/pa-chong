import { connect } from 'puppeteer-real-browser';
import fs from 'fs';
import { comparePrice } from './compare-price.js';

// 模拟人类鼠标移动的工具函数
async function humanMouseMove(page, targetX, targetY) {
	const mouse = page.mouse;

	// 获取当前鼠标位置(假设从屏幕中心开始)
	const startX = Math.random() * 100 + 100; // 随机起始位置
	const startY = Math.random() * 100 + 100;

	const steps = Math.floor(Math.random() * 30) + 20; // 20-50步

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		// 使用贝塞尔曲线模拟自然移动
		const x = startX + (targetX - startX) * t + (Math.random() - 0.5) * 10;
		const y = startY + (targetY - startY) * t + (Math.random() - 0.5) * 10;

		await mouse.move(x, y);
		await new Promise((resolve) =>
			setTimeout(resolve, Math.random() * 20 + 10)
		);
	}
}

// 模拟人类滚动行为
// async function humanScroll(page) {
// 	console.log('开始模拟人类滚动行为...');

// 	return await page.evaluate(async () => {
// 		return new Promise((resolve) => {
// 			let totalHeight = 0;
// 			const maxHeight = document.body.scrollHeight;
// 			let scrollCount = 0;
// 			const maxScrolls = 10; // 最多滚动次数

// 			const scroll = () => {
// 				if (totalHeight >= maxHeight || scrollCount >= maxScrolls) {
// 					resolve();
// 					return;
// 				}

// 				// 随机滚动距离: 200-500px
// 				const distance = Math.floor(Math.random() * 300) + 200;
// 				window.scrollBy(0, distance);
// 				totalHeight += distance;
// 				scrollCount++;

// 				// 随机等待时间: 300-800ms,模拟人类阅读和思考
// 				const delay = Math.floor(Math.random() * 500) + 300;

// 				setTimeout(scroll, delay);
// 			};

// 			scroll();
// 		});
// 	});
// }

// 模拟鼠标在页面上随机移动
async function randomMouseMovement(page) {
	const viewport = page.viewport();
	const width = viewport?.width || 1920;
	const height = viewport?.height || 1080;

	// 随机移动2-5次
	const movements = Math.floor(Math.random() * 3) + 2;

	for (let i = 0; i < movements; i++) {
		const x = Math.random() * width * 0.8 + width * 0.1; // 避免边缘
		const y = Math.random() * height * 0.8 + height * 0.1;
		await humanMouseMove(page, x, y);
		await new Promise((resolve) =>
			setTimeout(resolve, Math.random() * 500 + 200)
		);
	}
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
	await page.goto('https://www.adidas.co.kr', {
		waitUntil: 'networkidle2',
		timeout: 60000,
	});

	// 模拟人类浏览行为：随机移动鼠标
	console.log('模拟鼠标移动...');
	await randomMouseMovement(page);

	// 随机等待
	await new Promise((resolve) =>
		setTimeout(resolve, 3000 + Math.random() * 2000)
	);

	// 访问目标网页
	const url = 'https://www.adidas.co.kr/outlet?grid=true';
	console.log('现在访问目标页面...');

	await page.goto(url, {
		waitUntil: 'networkidle2',
		timeout: 60000,
	});

	// 页面加载后模拟鼠标移动
	console.log('页面加载完成,模拟浏览行为...');
	await randomMouseMovement(page);

	console.log('等待产品加载...');
	await new Promise((resolve) => setTimeout(resolve, 3000));

	// 检查产品网格是否存在
	const hasProductGrid = await page.evaluate(() => {
		const grid = document.querySelector('[data-testid="product-grid"]');
		return !!grid;
	});

	console.log('产品网格是否存在:', hasProductGrid);

	if (!hasProductGrid) {
		console.log('未找到产品网格，尝试滚动页面加载内容...');
		await page.evaluate(() => {
			window.scrollTo(0, document.body.scrollHeight);
		});
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}

	// 等待产品网格加载
	try {
		await page.waitForSelector('[data-testid="product-grid"]', {
			timeout: 10000,
		});
		console.log('产品网格已加载');
	} catch (err) {
		console.log('产品网格加载超时，尝试直接提取...', err.message);
	}

	console.log('开始提取产品信息...');

	// 多页抓取
	let allProducts = [];
	let pageNum = 1;
	const itemsPerPage = 48;

	while (true) {
		console.log(`\n正在抓取第 ${pageNum} 页...`);

		// 等待产品加载
		await new Promise((resolve) => setTimeout(resolve, 3000));

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
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 回到顶部
		await page.evaluate(() => {
			window.scrollTo(0, 0);
		});

		// 回到顶部后再次模拟鼠标移动
		await randomMouseMovement(page);

		await new Promise((resolve) => setTimeout(resolve, 1000));

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
			const productList = [];

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
					productList.push({
						code,
						name,
						price,
						url,
						imageUrl,
						isExtra30Off: isExtra30Off,
					});
				}
			});

			return productList;
		});

		console.log(`第 ${pageNum} 页找到 ${products.length} 个产品`);

		// 显示前15个产品的徽章检测情况
		products.slice(0, 15).forEach((p, i) => {
			console.log(
				`  ${i + 1}. ${p.code} - ${p.name} - Extra 30%: ${p.isExtra30Off ? '✓' : '✗'}`
			);
		});

		allProducts.push(...products);

		// 检查是否还有下一页
		if (pageInfo && pageNum >= pageInfo.total) {
			// <<<<
			// if (pageInfo && pageInfo.current >= 1) {
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

	// 去重
	const uniqueProducts = Array.from(
		new Map(allProducts.map((p) => [p.code, p])).values()
	);

	console.log(`\n总共提取 ${uniqueProducts.length} 个不重复的产品:\n`);

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
	).padStart(2, '0')}.html`;

	// 比较价格并生成HTML和Excel文件
	await comparePrice(uniqueProducts, fileName, dateTimeString);

	// 关闭浏览器
	await browser.close();
	console.log('浏览器已关闭');

	return uniqueProducts;
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
