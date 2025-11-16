import { connect } from 'puppeteer-real-browser';
import fs from 'fs';
import { comparePrice, findPreviousJSONFile, getCurrentDateTimeString, getFilePath, getTotalPages, loadSettings } from './utils/common.js';
import { generateExcel } from './utils/create-excel.js';
import { waitForProductGrid } from './utils/adidas/adidas.js';

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

	// 读取配置信息
	const settings = loadSettings();

	// 访问目标网页
	let url = settings.adidas.url;
	if (settings.adidas.isBlackFriday) url = settings.adidas.blackFridayUrl;
	console.log('现在访问目标页面...');

	await page.goto(url, {
		waitUntil: 'networkidle2',
		timeout: settings.CONFIG.PAGE_LOAD_TIMEOUT,
	});

	console.log('等待产品网格加载...');
	let isProductGridLoaded = await waitForProductGrid(page);
	if (!isProductGridLoaded) {
		console.log('❌ 产品网格加载失败');
		return;
	}

	console.log('开始提取产品信息...');

	// 多页抓取
	let allProducts = {}; // 改为对象,使用产品代码作为键
	let hasError = false;
	let pageNum = 1;
	const itemsPerPage = settings.adidas.itemPerPage;
	const pageInfo = await getTotalPages(page);

	// 检查是否有未完成的抓取任务
	const latestErroredJSONFile = findPreviousJSONFile(null, true);

	if (latestErroredJSONFile) {
		const lastErroredFilePath = getFilePath(latestErroredJSONFile.replace('.json', ''), 'json');
		const lastErroredProductData = JSON.parse(fs.readFileSync(lastErroredFilePath, 'utf-8'));

		if (lastErroredProductData.hasError && lastErroredProductData.errorPageNum) {
			console.log(`\n⚠️ 检测到上次抓取未完成,从第 ${lastErroredProductData.errorPageNum} 页继续抓取...`);
			pageNum = lastErroredProductData.errorPageNum;
			allProducts = lastErroredProductData.products || {};
		} else {
			console.log(`\n✅ 找到上次抓取文件,但已完成,从第1页开始新的抓取`);
		}
	} else {
		console.log(`\n✅ 未找到上次抓取文件,这是首次运行,从第1页开始`);
	}

	for (pageNum; pageNum <= pageInfo.total; pageNum++) {
		try {
			console.log(`\n正在抓取第 ${pageNum} 页...`);

			// 构建下一页URL
			const nextStart = (pageNum - 1) * itemsPerPage;
			const nextUrl = `${url}&start=${nextStart}`;

			console.log(`访问下一页: ${nextUrl}`);

			try {
				await page.goto(nextUrl, {
					waitUntil: 'networkidle2',
					timeout: settings.CONFIG.PAGE_LOAD_TIMEOUT,
				});
			} catch (err) {
				console.log(`❌ 无法加载下一页: ${err.message}`);
				hasError = true;
				break;
			}

			// 等待产品加载
			// console.log('等待产品网格加载...');
			let isProductGridLoaded = await waitForProductGrid(page);
			if (!isProductGridLoaded) {
				console.log('❌ 产品网格加载失败');
				hasError = true;
				break;
			}

			// 滚动页面以确保所有产品都被加载
			console.log('滚动页面以加载所有产品...');
			await page.evaluate(
				(scrollDistance, scrollInterval) => {
					return new Promise((resolve) => {
						let totalHeight = 0;
						const distance = scrollDistance;
						const timer = setInterval(() => {
							const scrollHeight = document.body.scrollHeight;
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
			const products = await page.evaluate((isBlackFriday) => {
				const productCards = document.querySelectorAll('[data-testid="plp-product-card"]');
				const productList = {}; // 使用对象来避免重复

				productCards.forEach((card) => {
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
							isExtra30Off: isBlackFriday ? true : isExtra30Off,
						};
					}
				});

				return productList;
			}, settings.adidas.isBlackFriday);

			const productValues = Object.values(products);
			console.log(`第 ${pageNum} 页找到 ${productValues.length} 个产品`);

			// 显示前3个产品的徽章检测情况
			productValues.slice(0, 3).forEach((p, i) => {
				console.log(`  ${i + 1}. ${p.code} - ${p.name} - Extra 30%: ${p.isExtra30Off ? '✓' : '✗'}`);
			});

			// 合并产品对象
			allProducts = { ...allProducts, ...products };

			// // debug: 限制只抓取1页
			// if (pageNum == 2 && forceDown) {
			// 	hasError = true;
			// 	forceDown = false;
			// 	break;
			// }

			// 检查是否还有下一页
			if (pageInfo && pageNum >= pageInfo.total) {
				// if (pageNum == 4) {
				console.log('已到达最后一页');
				break;
			}
		} catch (err) {
			// 捕获浏览器关闭或其他错误
			console.error(`❌ 抓取第 ${pageNum} 页时发生错误: ${err.message}`);
			hasError = true;
			break;
		}
	}

	// 由于allProducts现在是对象,键就是产品代码,已经自动去重了
	const uniqueProducts = allProducts;

	console.log(`\n总共提取 ${Object.keys(uniqueProducts).length} 个不重复的产品:\n`);

	// 保存到HTML文件
	const today = new Date();
	const dateTimeString = getCurrentDateTimeString();

	const fileName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${String(
		today.getHours()
	).padStart(2, '0')}-${String(today.getMinutes()).padStart(2, '0')}-${String(today.getSeconds()).padStart(2, '0')}`;

	// 保存最新数据到JSON文件
	const jsonFilePathAndName = getFilePath(fileName, 'json');

	const jsonData = {
		dateTimeString: dateTimeString,
		timestamp: today.toISOString(),
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
		console.log(`浏览器已被关闭或无法关闭: ${err.message}`);
	}

	if (hasError) {
		// re-run whole process if not finished
		console.log('抓取未完成，准备重新运行爬虫...');
		await scrapeAdidasProducts();
	} else {
		// 比较价格json data
		await comparePrice(fileName);

		// 生成 Excel 文件
		console.log(`准备生产Excel文件: ${fileName}.xlsx`);
		await generateExcel(fileName);
	}
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
