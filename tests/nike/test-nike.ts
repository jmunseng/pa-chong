/**
 * 测试 Nike API 数据抓取
 * API URL: https://api.nike.com/discover/product_wall/v1/marketplace/KR/language/ko/consumerChannelId/d9a5bc42-4b9c-4976-858a-f159cf99c647
 */

const NIKE_API_URL =
	'https://api.nike.com/discover/product_wall/v1/marketplace/KR/language/ko/consumerChannelId/d9a5bc42-4b9c-4976-858a-f159cf99c647?path=/kr/w/clearance-shoes-3yaepzy7ok&attributeIds=16633190-45e5-4830-a068-232ac7aea82c,5b21a62a-0503-400c-8336-3ccfbff2a684&queryType=PRODUCTS&anchor=0&count=100';

/**
 * 生成真实浏览器的 HTTP 头
 */
function getNikeBrowserHeaders(url: string): Record<string, string> {
	const parsedUrl = new URL(url);

	return {
		Accept: 'application/json',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		DNT: '1',
		Host: parsedUrl.hostname,
		Origin: 'https://www.nike.com',
		Pragma: 'no-cache',
		Referer: 'https://www.nike.com/kr/w/clearance-shoes-3yaepzy7ok',
		'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
		'Sec-CH-UA-Mobile': '?0',
		'Sec-CH-UA-Platform': '"macOS"',
		'Sec-Fetch-Dest': 'empty',
		'Sec-Fetch-Mode': 'cors',
		'Sec-Fetch-Site': 'same-site',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
		'nike-api-caller-id': 'd9a5bc42-4b9c-4976-858a-f159cf99c647',
	};
}

/**
 * 测试获取 Nike API 数据
 */
async function testFetchNikeAPI() {
	console.log('🚀 开始测试 Nike API 数据抓取...\n');
	console.log(`📍 URL: ${NIKE_API_URL}\n`);

	try {
		const headers = getNikeBrowserHeaders(NIKE_API_URL);

		console.log('📤 请求头:');
		console.log(JSON.stringify(headers, null, 2));
		console.log('\n⏳ 正在发送请求...\n');

		const response = await fetch(NIKE_API_URL, {
			method: 'GET',
			headers,
		});

		console.log(`📥 响应状态码: ${response.status}`);
		console.log(`📥 Content-Type: ${response.headers.get('content-type')}`);
		console.log(`📥 Content-Encoding: ${response.headers.get('content-encoding')}\n`);

		if (!response.ok) {
			console.error(`❌ 请求失败: HTTP ${response.status}`);
			const errorText = await response.text();
			console.error('错误内容:', errorText.substring(0, 500));
			return;
		}

		// 读取响应体
		const responseText = await response.text();

		// 检查是否为 HTML
		if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
			console.error('❌ 响应是 HTML 页面,不是 JSON 数据!');
			console.error('📄 响应内容前 500 字符:');
			console.error(responseText.substring(0, 500));
			return;
		}

		// 尝试解析 JSON
		try {
			const jsonData = JSON.parse(responseText);
			console.log('✅ 成功获取 JSON 数据!\n');

			// 分析数据结构
			console.log('📊 数据分析:');
			if (jsonData.productGroupings && Array.isArray(jsonData.productGroupings)) {
				console.log(`   - 产品组数量: ${jsonData.productGroupings.length}`);
				const totalProducts = jsonData.productGroupings.reduce((sum: number, group: any) => sum + (group.products?.length || 0), 0);
				console.log(`   - 总产品数量: ${totalProducts}`);

				if (jsonData.productGroupings.length > 0 && jsonData.productGroupings[0].products?.length > 0) {
					console.log('\n🔍 第一个产品示例:');
					console.log(JSON.stringify(jsonData.productGroupings[0].products[0], null, 2));
				}
			}

			if (jsonData.pages) {
				console.log(`\n   - 分页信息: ${JSON.stringify(jsonData.pages)}`);
			}

			// 保存完整响应示例
			const fs = await import('fs');
			const sampleFilePath = '/Users/leon/Downloads/pa-chong/src/types/sample-nike-official-api.json';
			fs.writeFileSync(sampleFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
			console.log(`\n💾 完整响应已保存到: ${sampleFilePath}`);
		} catch (parseError) {
			console.error('❌ JSON 解析失败!');
			console.error('📄 响应内容:');
			console.error(responseText);
		}
	} catch (error) {
		console.error('❌ 请求失败:');
		if (error instanceof Error) {
			console.error(`错误信息: ${error.message}`);
			console.error(`错误堆栈: ${error.stack}`);
		} else {
			console.error(error);
		}
	}
}

// 运行测试
testFetchNikeAPI()
	.then(() => {
		console.log('\n✅ 测试完成!');
	})
	.catch((error) => {
		console.error('\n❌ 测试失败:', error);
	});
