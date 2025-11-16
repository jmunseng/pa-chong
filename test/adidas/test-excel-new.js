import { generateExcel } from '../../utils/create-excel.js';

// 测试新的简化接口
// 注意: fileName 不应包含 collection/ 前缀，getFilePath 会自动添加
const fileName = 'adidas-extra-sale-products_2025-11-05_23-38-43';

console.log('开始测试 Excel 生成功能...\n');
console.log(`输入文件名: ${fileName}`);

generateExcel(fileName)
	.then((excelFileName) => {
		console.log(`\n✅ 测试成功！Excel 文件已生成: ${excelFileName}`);
	})
	.catch((error) => {
		console.error('❌ 测试失败:', error.message);
	});
