import fs from 'fs';
import { comparePrice, generateFileName, getCurrentDateTimeString, getFilePath, loadSettings } from '../../../utils/common.js';
import { E_BrandOption } from '../../enum/enum-musinsa.js';
import { E_BrandSite } from '../../enum/enum-brand-site.js';

// 读取配置信息
async function scrapeMusinsaProducts(e_brandOption = E_BrandOption.Adidas) {
	const settings = loadSettings();
	const products = [];

	let totalPageNumber = 1;
	let currentPage = 1;
	let hasError = false;
	let pageNum = 1;
	const uniqueProducts = {}; // 使用对象来存储唯一的产品，键为 goodsNo

	while (currentPage <= totalPageNumber) {
		// 构造 URL，替换 page 参数
		const apiUrl = settings.musinsa[e_brandOption].url.replace('{PAGE}', currentPage);

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		});
		const res = await response.json();
		if (res && res.data && res.data.list && res.data.pagination && res.meta.result === 'SUCCESS') {
			products.push(...res.data.list);

			// 更新总页数
			if (currentPage === 1) {
				totalPageNumber = res.data.pagination.totalPages;
				console.log(`总共 ${totalPageNumber} 页，总商品数: ${res.data.pagination.totalCount}`);
			}

			if (settings.isDebugMode) {
				totalPageNumber = 2; // 调试模式只抓前2页
			}

			console.log(`第 ${currentPage}/${totalPageNumber} 页抓取完成，本页商品数: ${res.data.list.length}`);

			// 稍微等待一下，防止请求太快被封
			await new Promise((r) => setTimeout(r, 2000));
			currentPage++;
		} else {
			console.error('API 返回数据格式不正确:', res);
			break;
		}
	}

	console.log(`\n抓取完成! 总共抓取到 ${products.length} 个商品`);

	if (products.length) {
		// 去重
		for (const product of products) {
			// goodsName: '아디폼 슈퍼스타 - 화이트:블랙 / HQ8750'
			let code = '';
			const nameParts = product.goodsName.split('/');
			if (nameParts.length > 1) {
				code = nameParts[1].trim();
			} else {
				code = product.goodsNo.toString();
			}
			// console.log(code);
			product.code = code; // 添加 code 字段
			uniqueProducts[code] = product;
		}
		console.log(`去重后共有 ${Object.keys(uniqueProducts).length} 个唯一商品`);
	}

	// 保存到HTML文件
	const dateNow = new Date();
	const dateTimeString = getCurrentDateTimeString();

	const fileName = generateFileName(dateNow);

	// 保存最新数据到JSON文件
	const jsonFilePathAndName = getFilePath(E_BrandSite.Musinsa, e_brandOption, fileName, 'json');

	const jsonData = {
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

	await comparePrice(E_BrandSite.Musinsa, e_brandOption, fileName);
}

// 运行脚本
export async function runMusinsaTask(e_brandOption = E_BrandOption.Adidas) {
	console.log(`正在执行 ${E_BrandOption.GetString[e_brandOption]}`);

	// 调用爬虫逻辑,传入 eventOption
	scrapeMusinsaProducts(e_brandOption)
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
}
