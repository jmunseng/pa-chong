import ExcelJS from 'exceljs';
import fs from 'fs';
import { getFilePath } from '../common.js';
import { E_BrandSite } from '../../src/enum/enum-brand-site.js';

/**
 * 生成 Excel 文件
 * @param {string} fileName - JSON 文件名 (不包含扩展名)
 * 例如: '2025-11-05_01-30-56'
 */
export async function generateExcel(e_brandSite, fileName) {
	// 读取 JSON 文件
	const jsonFilePath = getFilePath(e_brandSite, fileName, 'json');
	if (!fs.existsSync(jsonFilePath)) {
		throw new Error(`JSON 文件不存在: ${jsonFilePath}`);
	}

	const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
	const products = Object.values(jsonData.products);
	const dateTimeString = jsonData.dateTimeString;

	console.log(`从 ${jsonFilePath} 读取了 ${products.length} 个产品`);
	console.log(`抓取时间: ${dateTimeString}`);
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet(`${E_BrandSite.GetString[e_brandSite]} Extra Sale`);

	// 设置列宽和行高
	worksheet.columns = [
		{ header: '번호', key: 'index', width: 6 },
		{ header: '상품명', key: 'name', width: 40 },
		{ header: '상품코드', key: 'code', width: 15 },
		{ header: '가격', key: 'priceKRW', width: 15 },
		{ header: '추가30할인유무', key: 'hasExtra30Off', width: 18 },
		{ header: '추가30가격', key: 'discountedPrice', width: 15 },
		{ header: '가격', key: 'originalPrice', width: 15 },
	];

	// 设置标题行样式
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	headerRow.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FF000000' },
	};
	headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

	// 添加产品数据
	console.log(`开始处理 ${products.length} 个产品...`);
	const startTime = Date.now();

	// 添加所有产品行
	const rows = [];
	products.forEach((product, index) => {
		// 计算30%折扣后的价格
		const originalPrice = product.price || 0;
		// 兼容 isExtra30Off 和 hasExtra30Off 两种字段名
		const hasExtra30Off = product.isExtra30Off || product.hasExtra30Off || false;
		const discountedPrice = hasExtra30Off ? Math.round(originalPrice * 0.7) : originalPrice;

		const row = worksheet.addRow({
			index: index + 1,
			name: product.name || '',
			code: product.code || '',
			priceKRW: originalPrice,
			hasExtra30Off: hasExtra30Off ? 'O' : 'X',
			discountedPrice: discountedPrice,
			originalPrice: originalPrice,
		});

		// 设置行高
		row.height = 20;

		// 为"추가30가격"列（F列）设置黄色背景
		const discountedPriceCell = row.getCell('discountedPrice');
		discountedPriceCell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFFFFF00' }, // 黄色
		};

		// 设置所有单元格居中对齐
		row.eachCell((cell) => {
			cell.alignment = { vertical: 'middle', horizontal: 'left' };
		});

		// 产品名称左对齐
		const nameCell = row.getCell('name');
		nameCell.alignment = { vertical: 'middle', horizontal: 'left' };

		// 价格列右对齐
		const priceKRWCell = row.getCell('priceKRW');
		priceKRWCell.alignment = { vertical: 'middle', horizontal: 'right' };

		const discountedPriceCellAlign = row.getCell('discountedPrice');
		discountedPriceCellAlign.alignment = { vertical: 'middle', horizontal: 'right' };

		const originalPriceCell = row.getCell('originalPrice');
		originalPriceCell.alignment = { vertical: 'middle', horizontal: 'right' };

		rows.push(row);
	});

	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n产品处理完成! 总计: ${products.length} | 用时: ${totalTime}秒`);

	// 添加自动筛选
	worksheet.autoFilter = {
		from: 'A1',
		to: `G${products.length + 1}`,
	};

	// 冻结首行
	worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

	// 添加信息工作表
	const infoSheet = workbook.addWorksheet('抓取信息');
	infoSheet.columns = [
		{ header: '项目', key: 'item', width: 25 },
		{ header: '值', key: 'value', width: 40 },
	];

	// 设置标题行样式
	const infoHeaderRow = infoSheet.getRow(1);
	infoHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	infoHeaderRow.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FF000000' },
	};
	infoHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

	infoSheet.addRow({ item: '抓取时间', value: dateTimeString });
	infoSheet.addRow({ item: '总产品数', value: products.length });
	infoSheet.addRow({
		item: '有额外30%折扣的产品数',
		value: products.filter((p) => p.isExtra30Off || p.hasExtra30Off).length,
	});

	// 保存文件
	// fileName 不包含扩展名，直接添加 .xlsx
	const excelFileName = getFilePath(e_brandSite, fileName, 'xlsx');
	await workbook.xlsx.writeFile(excelFileName);
	console.log(`\nExcel 文件已生成: ${excelFileName}`);

	return excelFileName;
}
