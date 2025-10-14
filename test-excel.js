import { generateExcel } from './create-excel.js';

// 测试数据 - 少量产品用于快速测试
const testProducts = [
	{
		name: '测试产品 1',
		code: 'TEST001',
		price: '50,000',
		imageUrl: 'https://assets.adidas.com/images/w_600,f_auto,q_auto/4c70105150234ac4b948a8bf01187e0c_9366/Superstar_Shoes_White_EG4958_01_standard.jpg',
		url: 'https://www.adidas.co.kr/test1',
		isNewItem: true,
		hasExtra30Off: true,
	},
	{
		name: '测试产品 2',
		code: 'TEST002',
		price: '60,000',
		previousPrice: '70,000',
		priceGap: '-10,000',
		imageUrl: 'https://assets.adidas.com/images/w_600,f_auto,q_auto/4c70105150234ac4b948a8bf01187e0c_9366/Superstar_Shoes_White_EG4958_01_standard.jpg',
		url: 'https://www.adidas.co.kr/test2',
		isPriceDropped: true,
		hasExtra30Off: false,
	},
	{
		name: '测试产品 3',
		code: 'TEST003',
		price: '80,000',
		previousPrice: '75,000',
		priceGap: '+5,000',
		imageUrl: 'https://invalid-url-test.com/image.jpg', // 故意使用无效URL测试错误处理
		url: 'https://www.adidas.co.kr/test3',
		isPriceIncreased: true,
		hasExtra30Off: true,
	},
];

console.log('开始测试 Excel 生成功能...\n');

generateExcel(
	testProducts,
	'test-excel-output.xlsx',
	'2025-10-14 14:30:00',
	'2025-10-13 12:00:00',
	[]
)
	.then((fileName) => {
		console.log('\n✅ 测试完成!');
		console.log(`生成的文件: ${fileName}`);
		console.log('\n请打开文件检查:');
		console.log('1. 图片是否正确嵌入');
		console.log('2. 失败的图片是否显示错误标记');
		console.log('3. 样式是否正确应用');
	})
	.catch((error) => {
		console.error('\n❌ 测试失败:', error);
	});
