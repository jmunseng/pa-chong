/**
 * 测试 Adidas API 的分页参数
 */

async function testPageSize() {
	const baseUrl = 'https://www.adidas.co.kr/plp-app/_next/data/ElfpMmIrFt5PD9X9NVWf7/men.json?grid=true&start=0&path=men';

	const testCases = [
		{ url: baseUrl, desc: '默认 (无 size 参数)' },
		{ url: baseUrl + '&size=96', desc: 'size=96' },
		{ url: baseUrl + '&size=100', desc: 'size=100' },
		{ url: baseUrl + '&count=96', desc: 'count=96' },
		{ url: baseUrl + '&viewSize=96', desc: 'viewSize=96' },
	];

	for (const testCase of testCases) {
		console.log(`\n${'='.repeat(60)}`);
		console.log(`测试: ${testCase.desc}`);
		console.log('='.repeat(60));
		console.log(`URL: ${testCase.url}`);

		try {
			const response = await fetch(testCase.url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
				},
			});

			if (response.ok) {
				const data = await response.json();

				if (data.pageProps && data.pageProps.products) {
					const productsCount = data.pageProps.products.length;
					const totalCount = data.pageProps.info?.count;
					const viewSize = data.pageProps.info?.viewSize;

					console.log(`✅ 成功!`);
					console.log(`   返回商品数: ${productsCount}`);
					console.log(`   总商品数: ${totalCount}`);
					console.log(`   viewSize: ${viewSize}`);
				} else {
					console.log('❌ 响应格式不正确');
				}
			} else {
				console.log(`❌ 请求失败: ${response.status}`);
			}
		} catch (error) {
			console.log(`❌ 错误: ${error.message}`);
		}

		// 等待 1 秒
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
}

testPageSize();
