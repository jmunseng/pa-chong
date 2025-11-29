// /**
//  * 测试 Adidas Extra 30 API
//  * URL: https://www.adidas.co.kr/plp-app/api/product/IE3677?dxp=true
//  */

// import { request } from 'undici';
// import { brotliDecompressSync, gunzipSync } from 'zlib';

// // 测试两个产品: 一个没有 Extra 30,一个有 Extra 30
// const TEST_URLS = [
// 	'https://www.adidas.co.kr/plp-app/api/product/IE3677?dxp=true', // 没有 Extra 30
// 	'https://www.adidas.co.kr/plp-app/api/product/JI1282?dxp=true', // 有 Extra 30
// ];

// /**
//  * 生成真实浏览器的 HTTP 头
//  */
// function getBrowserHeaders(url: string): Record<string, string> {
// 	const parsedUrl = new URL(url);

// 	return {
// 		Accept: '*/*',
// 		'Accept-Encoding': 'gzip, deflate, br, zstd',
// 		'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
// 		'Cache-Control': 'no-cache',
// 		Connection: 'keep-alive',
// 		DNT: '1',
// 		Host: parsedUrl.hostname,
// 		Origin: 'https://www.adidas.co.kr',
// 		Pragma: 'no-cache',
// 		Priority: 'u=1, i',
// 		Referer: 'https://www.adidas.co.kr/outlet?grid=true',
// 		'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
// 		'Sec-CH-UA-Arch': '"arm"',
// 		'Sec-CH-UA-Bitness': '"64"',
// 		'Sec-CH-UA-Full-Version': '"131.0.6778.86"',
// 		'Sec-CH-UA-Full-Version-List':
// 			'"Google Chrome";v="131.0.6778.86", "Chromium";v="131.0.6778.86", "Not_A Brand";v="24.0.0.0"',
// 		'Sec-CH-UA-Mobile': '?0',
// 		'Sec-CH-UA-Model': '""',
// 		'Sec-CH-UA-Platform': '"macOS"',
// 		'Sec-CH-UA-Platform-Version': '"15.1.0"',
// 		'Sec-Fetch-Dest': 'empty',
// 		'Sec-Fetch-Mode': 'cors',
// 		'Sec-Fetch-Site': 'same-origin',
// 		'User-Agent':
// 			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
// 		'X-Requested-With': 'XMLHttpRequest',
// 	};
// }

// /**
//  * 测试获取 API 数据
//  */
// async function testFetchAPI(url: string, productName: string) {
// 	console.log(`\n${'='.repeat(80)}`);
// 	console.log(`🧪 测试产品: ${productName}`);
// 	console.log(`📍 URL: ${url}\n`);

// 	try {
// 		const headers = getBrowserHeaders(url);

// 		console.log('📤 请求头:');
// 		console.log(JSON.stringify(headers, null, 2));
// 		console.log('\n⏳ 正在发送请求...\n');

// 		const { statusCode, headers: responseHeaders, body } = await request(url, {
// 			method: 'GET',
// 			headers,
// 		});

// 		console.log(`📥 响应状态码: ${statusCode}`);
// 		console.log(`📥 Content-Type: ${responseHeaders['content-type']}`);
// 		console.log(`📥 Content-Encoding: ${responseHeaders['content-encoding']}\n`);

// 		// 读取响应体为 Buffer
// 		const buffer = await body.arrayBuffer();
// 		const contentEncoding = responseHeaders['content-encoding'] as string;

// 		// 根据编码类型解压缩
// 		let responseText: string;
// 		if (contentEncoding === 'gzip') {
// 			console.log('🔓 检测到 gzip 压缩,正在解压...');
// 			responseText = gunzipSync(Buffer.from(buffer)).toString('utf-8');
// 		} else if (contentEncoding === 'br') {
// 			console.log('🔓 检测到 Brotli 压缩,正在解压...');
// 			responseText = brotliDecompressSync(Buffer.from(buffer)).toString('utf-8');
// 		} else {
// 			responseText = new TextDecoder().decode(buffer);
// 		}

// 		// 检查是否为 HTML
// 		if (
// 			responseText.trim().startsWith('<!DOCTYPE') ||
// 			responseText.trim().startsWith('<html')
// 		) {
// 			console.error('❌ 响应是 HTML 页面,不是 JSON 数据!');
// 			console.error('📄 响应内容前 500 字符:');
// 			console.error(responseText.substring(0, 500));
// 			return;
// 		}

// 		// 尝试解析 JSON
// 		try {
// 			const jsonData = JSON.parse(responseText);
// 			console.log('✅ 成功获取 JSON 数据!\n');
// 			console.log('📦 响应数据:');
// 			console.log(JSON.stringify(jsonData, null, 2));

// 			// 检查是否有 Extra 30 徽章
// 			if (jsonData?.product?.badge?.text) {
// 				console.log(`\n🏷️  徽章文本: ${jsonData.product.badge.text}`);
// 				if (jsonData.product.badge.text.includes('30%')) {
// 					console.log('✨ 确认有 Extra 30% 折扣!');
// 				}
// 			}
// 		} catch (parseError) {
// 			console.error('❌ JSON 解析失败!');
// 			console.error('📄 响应内容:');
// 			console.error(responseText);
// 		}
// 	} catch (error) {
// 		console.error('❌ 请求失败:');
// 		if (error instanceof Error) {
// 			console.error(`错误信息: ${error.message}`);
// 			console.error(`错误堆栈: ${error.stack}`);
// 		} else {
// 			console.error(error);
// 		}
// 	}
// }

// // 运行测试
// async function runAllTests() {
// 	console.log('🚀 开始测试 Adidas Extra 30 API...');

// 	// 测试没有 Extra 30 的产品
// 	await testFetchAPI(TEST_URLS[0], 'IE3677 - 삼바 OG (无 Extra 30)');

// 	// 等待 2 秒
// 	await new Promise((resolve) => setTimeout(resolve, 2000));

// 	// 测试有 Extra 30 的产品
// 	await testFetchAPI(TEST_URLS[1], 'JI1282 - SL 72 RS (有 Extra 30)');

// 	console.log('\n' + '='.repeat(80));
// 	console.log('✅ 所有测试完成!');
// }

// runAllTests();
