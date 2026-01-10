import ExcelJS from 'exceljs';
import fs from 'fs';

import type { E_BrandSite } from '../../enum/enum-brand-site';
import type { E_BrandOption } from '../../enum/enum-musinsa';
import type { LululemonProduct, LululemonProductData } from '../../types/lululemon-product';

import { E_BrandSite_GetString } from '../../enum/enum-brand-site';
import { getFilePath } from '../common';

/**
 * 生成 Excel 文件
 * @param e_brandSite - 品牌网站
 * @param e_brandOption - 品牌选项
 * @param fileName - JSON 文件名 (不包含扩展名), 例如: '2025-11-05_01-30-56'
 * @returns Excel 文件路径
 */
export async function generateExcel(e_brandSite: E_BrandSite, e_brandOption: E_BrandOption, fileName: string): Promise<string> {
	// 读取 JSON 文件
	const jsonFilePath: string = getFilePath(e_brandSite, e_brandOption, fileName, 'json');
	if (!fs.existsSync(jsonFilePath)) {
		throw new Error(`JSON 文件不存在: ${jsonFilePath}`);
	}

	const jsonData: LululemonProductData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
	const products: LululemonProduct[] = Object.values(jsonData.products);
	const dateTimeString: string = jsonData.dateTimeString;

	console.log(`从 ${jsonFilePath} 读取了 ${products.length} 个产品`);
	console.log(`抓取时间: ${dateTimeString}`);
	const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
	const worksheet: ExcelJS.Worksheet = workbook.addWorksheet(`${E_BrandSite_GetString[e_brandSite]} Products`);

	// 设置列宽和行高
	worksheet.columns = [
		{ header: '번호', key: 'index', width: 6 },
		{ header: '상품명', key: 'name', width: 40 },
		{ header: '상품코드', key: 'code', width: 15 },
		{ header: '현재가격', key: 'priceKRW', width: 15 },
		{ header: '색상', key: 'colorName', width: 20 },
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
	const startTime: number = Date.now();

	// 添加所有产品行
	const rows: ExcelJS.Row[] = [];
	products.forEach((product: LululemonProduct, index: number) => {
		// 获取当前价格
		const currentPrice: number = product.price || 0;

		const row = worksheet.addRow({
			index: index + 1,
			name: product.name || '',
			code: product.code || '',
			priceKRW: currentPrice,
			colorName: product.colorName || '',
		});

		// 设置行高
		row.height = 20;

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

		rows.push(row);
	});

	const totalTime: string = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n产品处理完成! 总计: ${products.length} | 用时: ${totalTime}秒`);

	// 添加自动筛选
	worksheet.autoFilter = {
		from: 'A1',
		to: `E${products.length + 1}`,
	};

	// 冻结首行
	worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

	// 添加信息工作表
	const infoSheet: ExcelJS.Worksheet = workbook.addWorksheet('抓取信息');
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
		item: '有折扣的产品数',
		value: products.filter((p: LululemonProduct) => p.originalPrice && p.originalPrice > p.price).length,
	});

	// 保存文件
	// fileName 不包含扩展名，直接添加 .xlsx
	const excelFileName: string = getFilePath(e_brandSite, e_brandOption, fileName, 'xlsx');
	await workbook.xlsx.writeFile(excelFileName);
	console.log(`\nExcel 文件已生成: ${excelFileName}`);

	return excelFileName;
}
