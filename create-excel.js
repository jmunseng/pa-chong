import ExcelJS from 'exceljs';
import axios from 'axios';

/**
 * 从 URL 中提取图片扩展名
 * @param {string} url - 图片URL
 * @returns {string} - 图片扩展名 (jpeg, png, gif, webp)
 */
function getImageExtension(url) {
	try {
		const ext = url.split('.').pop().toLowerCase().split('?')[0];
		const validExts = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
		if (validExts.includes(ext)) {
			return ext === 'jpg' ? 'jpeg' : ext;
		}
		return 'jpeg'; // 默认使用 jpeg
	} catch {
		return 'jpeg';
	}
}

/**
 * 下载图片为 Buffer
 * @param {string} url - 图片URL
 * @returns {Promise<{buffer: Buffer, extension: string}|null>}
 */
async function downloadImage(url) {
	try {
		const response = await axios.get(url, {
			responseType: 'arraybuffer',
			timeout: 15000, // 增加到15秒
			maxRedirects: 5,
		});
		return {
			buffer: Buffer.from(response.data),
			extension: getImageExtension(url),
		};
	} catch (error) {
		console.error(`下载图片失败: ${url}`, error.message);
		return null;
	}
}

/**
 * 生成 Excel 文件
 * @param {Array} products - 产品数组
 * @param {string} fileName - Excel 文件名 (不包含扩展名)
 * @param {string} dateTimeString - 抓取时间
 * @param {string} previousDateTime - 上一次抓取时间 (可选)
 * @param {Array} removedProducts - 已下架产品 (可选)
 */
export async function generateExcel(products, fileName, dateTimeString, previousDateTime = null, removedProducts = []) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Adidas Extra Sale');

	// 设置列宽和行高
	worksheet.columns = [
		{ header: '#', key: 'index', width: 6 },
		{ header: '图片', key: 'image', width: 20 },
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

	// 添加产品数据并嵌入图片
	console.log(`开始处理 ${products.length} 个产品的图片...`);
	const startTime = Date.now();

	// 首先添加所有产品行
	const rows = [];
	products.forEach((product, index) => {
		const row = worksheet.addRow({
			index: index + 1,
			image: '', // 图片将通过 addImage 添加
			name: product.name || '',
			code: product.code || '',
			priceKRW: product.price || '',
			previousPrice: product.previousPrice || '',
			priceGap: product.priceGap || '',
			status: product.isNewItem ? '新产品' : product.isPriceDropped ? '降价' : product.isPriceIncreased ? '涨价' : '',
			hasExtra30Off: product.hasExtra30Off ? '是' : '否',
			url: product.url || '',
		});

		// 设置行高以容纳图片
		row.height = 80;

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

		rows.push(row);
	});

	// 并发下载图片 - 批量处理以提高性能
	const BATCH_SIZE = 10; // 每批处理10个图片
	let successCount = 0;
	let failCount = 0;

	for (let i = 0; i < products.length; i += BATCH_SIZE) {
		const batchEnd = Math.min(i + BATCH_SIZE, products.length);
		const batch = products.slice(i, batchEnd);

		// 并发下载当前批次的所有图片
		const imageResults = await Promise.all(
			batch.map(async (product) => {
				if (!product.imageUrl) return null;
				return await downloadImage(product.imageUrl);
			})
		);

		// 将下载的图片添加到工作簿
		imageResults.forEach((imageData, batchIndex) => {
			const index = i + batchIndex;
			const product = products[index];
			const rowNumber = index + 2; // +2 因为第1行是标题,数据从第2行开始
			const row = rows[index];

			if (imageData) {
				try {
					// 添加图片到工作簿
					const imageId = workbook.addImage({
						buffer: imageData.buffer,
						extension: imageData.extension,
					});

					// 将图片嵌入到单元格 B{rowNumber} (图片列)
					worksheet.addImage(imageId, {
						tl: { col: 1, row: rowNumber - 1 }, // B列 (索引1),行号-1因为从0开始
						ext: { width: 100, height: 100 },
						editAs: 'oneCell',
					});

					successCount++;
				} catch (error) {
					console.error(`嵌入图片失败 (产品 ${index + 1}):`, error.message);
					// 在单元格中标记失败
					const imageCell = row.getCell('image');
					imageCell.value = '❌ 嵌入失败';
					imageCell.font = { color: { argb: 'FFFF0000' } };
					failCount++;
				}
			} else if (product.imageUrl) {
				// 下载失败
				const imageCell = row.getCell('image');
				imageCell.value = '❌ 下载失败';
				imageCell.font = { color: { argb: 'FFFF0000' } };
				failCount++;
			}
		});

		const progress = Math.round((batchEnd / products.length) * 100);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`已处理 ${batchEnd}/${products.length} 个产品图片 (${progress}%) - 用时: ${elapsed}秒`);
	}

	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n图片处理完成! 总计: ${products.length} | 成功: ${successCount} | 失败: ${failCount} | 用时: ${totalTime}秒`);

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
