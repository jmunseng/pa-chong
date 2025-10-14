import ExcelJS from 'exceljs';

/**
 * 生成 Excel 文件
 * @param {Array} products - 产品数组
 * @param {string} fileName - Excel 文件名 (不包含扩展名)
 * @param {string} dateTimeString - 抓取时间
 * @param {string} previousDateTime - 上一次抓取时间 (可选)
 * @param {Array} removedProducts - 已下架产品 (可选)
 */
export async function generateExcel(
	products,
	fileName,
	dateTimeString,
	previousDateTime = null,
	removedProducts = []
) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Adidas Extra Sale');

	// 设置列宽
	worksheet.columns = [
		{ header: '#', key: 'index', width: 6 },
		{ header: '图片URL', key: 'imageUrl', width: 50 },
		{ header: 'Name', key: 'name', width: 40 },
		{ header: 'Code', key: 'code', width: 15 },
		{ header: 'Price (KRW)', key: 'priceKRW', width: 15 },
		{ header: 'Previous Price', key: 'previousPrice', width: 15 },
		{ header: 'Price Gap', key: 'priceGap', width: 15 },
		{ header: 'Status', key: 'status', width: 15 },
		{ header: 'Has Extra 30% Off', key: 'hasExtra30Off', width: 18 },
		{ header: 'URL', key: 'url', width: 60 },
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
	products.forEach((product, index) => {
		const row = worksheet.addRow({
			index: index + 1,
			imageUrl: product.imageUrl || '',
			name: product.name || '',
			code: product.code || '',
			priceKRW: product.price || '',
			previousPrice: product.previousPrice || '',
			priceGap: product.priceGap || '',
			status: product.isNewItem
				? '新产品'
				: product.isPriceDropped
					? '降价'
					: product.isPriceIncreased
						? '涨价'
						: '',
			hasExtra30Off: product.hasExtra30Off ? '是' : '否',
			url: product.url || '',
		});

		// 设置行样式
		if (product.isNewItem) {
			// 新产品 - 绿色背景
			row.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFC8E6C9' },
			};
		} else if (product.isPriceDropped) {
			// 降价 - 黄色背景
			row.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFFEB3B' },
			};
		} else if (product.isPriceIncreased) {
			// 涨价 - 红色背景
			row.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFFCDD2' },
			};
		}

		// URL 列添加超链接
		const urlCell = row.getCell('url');
		if (product.url) {
			urlCell.value = {
				text: product.url,
				hyperlink: product.url,
			};
			urlCell.font = { color: { argb: 'FF0066CC' }, underline: true };
		}

		// 图片URL列添加超链接
		const imageCell = row.getCell('imageUrl');
		if (product.imageUrl) {
			imageCell.value = {
				text: product.imageUrl,
				hyperlink: product.imageUrl,
			};
			imageCell.font = { color: { argb: 'FF0066CC' }, underline: true };
		}
	});

	// 添加自动筛选
	worksheet.autoFilter = {
		from: 'A1',
		to: `J${products.length + 1}`,
	};

	// 冻结首行
	worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

	// 添加信息工作表
	const infoSheet = workbook.addWorksheet('信息');
	infoSheet.columns = [
		{ header: '项目', key: 'item', width: 20 },
		{ header: '值', key: 'value', width: 40 },
	];

	infoSheet.addRow({ item: '抓取时间', value: dateTimeString });
	if (previousDateTime) {
		infoSheet.addRow({
			item: '上一次抓取时间',
			value: previousDateTime,
		});
	}
	infoSheet.addRow({ item: '总产品数', value: products.length });
	infoSheet.addRow({
		item: '新产品数',
		value: products.filter((p) => p.isNewItem).length,
	});
	infoSheet.addRow({
		item: '降价产品数',
		value: products.filter((p) => p.isPriceDropped).length,
	});
	infoSheet.addRow({
		item: '涨价产品数',
		value: products.filter((p) => p.isPriceIncreased).length,
	});
	infoSheet.addRow({
		item: '已下架产品数',
		value: removedProducts.length,
	});
	infoSheet.addRow({
		item: '有额外30%折扣的产品数',
		value: products.filter((p) => p.hasExtra30Off).length,
	});

	// 添加汇率计算说明
	infoSheet.addRow({ item: '', value: '' });
	infoSheet.addRow({ item: '汇率计算', value: '' });
	infoSheet.addRow({
		item: '输入汇率',
		value: '在下方输入韩元兑人民币汇率 →',
	});
	infoSheet.addRow({ item: '汇率', value: 196 }); // 默认汇率

	// 添加已下架产品工作表
	if (removedProducts.length > 0) {
		const removedSheet = workbook.addWorksheet('已下架产品');
		removedSheet.columns = [
			{ header: 'Code', key: 'code', width: 15 },
			{ header: 'Price', key: 'price', width: 15 },
		];

		const removedHeaderRow = removedSheet.getRow(1);
		removedHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
		removedHeaderRow.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFE65100' },
		};

		removedProducts.forEach((product) => {
			removedSheet.addRow({
				code: product.code,
				price: product.price,
			});
		});
	}

	// 保存文件
	const excelFileName = fileName.replace('.html', '.xlsx');
	await workbook.xlsx.writeFile(excelFileName);
	console.log(`\nExcel 文件已生成: ${excelFileName}`);

	return excelFileName;
}
