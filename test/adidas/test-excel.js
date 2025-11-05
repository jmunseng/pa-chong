import { generateExcel } from '../../utils/adidas/create-excel.js';
import fs from 'fs';

// 读取 JSON 文件
const jsonFilePath = './collection/adidas-extra-sale-products_2025-10-27_01-05-46.json';
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

// 将产品对象转换为数组
const productsArray = Object.values(jsonData.products);

console.log(`读取到 ${productsArray.length} 个产品`);
console.log(`有额外30%折扣的产品: ${productsArray.filter((p) => p.isExtra30Off).length} 个`);

// 生成 Excel 文件
const fileName = './collection/adidas-extra-sale-products_2025-10-27_01-05-46.xlsx';
const dateTimeString = jsonData.dateTimeString;

generateExcel(productsArray, fileName, dateTimeString)
	.then((excelFileName) => {
		console.log(`\n✅ Excel 文件生成成功: ${excelFileName}`);
	})
	.catch((error) => {
		console.error('❌ Excel 生成失败:', error);
	});
