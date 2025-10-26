import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmailToSubscribers } from '../send-email.js';
// import { generateExcel } from './create-excel.js';

const __currentFileDirPath = fileURLToPath(import.meta.url);
const __dirPath = path.dirname(path.dirname(__currentFileDirPath)); // 项目根目录

// 从HTML文件中提取产品信息（代码、价格）
export function extractProductsFromHTML(htmlPath) {
	if (!fs.existsSync(htmlPath)) {
		return null;
	}

	const htmlContent = fs.readFileSync(htmlPath, 'utf8');
	const productsMap = new Map();

	// 按行解析 - 找到所有产品行,逐行提取信息
	// 匹配 <div class="row...">...</div> (非贪婪匹配到下一个 row 或结束)
	const rowRegex = /<div class="row[^"]*">[\s\S]*?(?=<div class="row|$)/g;
	const rows = htmlContent.match(rowRegex) || [];

	rows.forEach((rowHtml) => {
		// 跳过 header 行
		if (rowHtml.includes('class="row header"')) {
			return;
		}

		// 1. 提取产品代码 (在 onclick="copyCode(this)" 的 cell 中)
		const codeMatch = rowHtml.match(
			/<div class="cell"[^>]*onclick="copyCode\(this\)">([^<]+)<\/div>/
		);
		const code = codeMatch ? codeMatch[1].trim() : null;

		// 2. 提取价格 (在 price-krw div 中)
		const priceMatch = rowHtml.match(
			/<div class="price-krw">([^<]+)<\/div>/
		);
		const priceStr = priceMatch
			? priceMatch[1].match(/([\d,]+)\s*원/) // remove 원, commas
			: null;
		const price = priceStr ? parseInt(priceStr[1].replace(/,/g, '')) : null; // remove commas

		// 3. 检查是否有额外30%折扣标记
		const isExtra30Off = rowHtml.includes('class="extra-30-badge"');

		// 只添加有效的产品 (必须有代码和价格)
		if (code && price) {
			productsMap.set(code, { price, isExtra30Off });
		}
	});

	return productsMap;
}

// 模拟鼠标在页面上随机移动;
export async function randomMouseMovement(page) {}

// 查找最新的两个HTML文件
/**
 * @excludeFileName {string|null} 排除的文件名（不包括扩展名）
 * @returns {string|null} 返回最新的文件路径，或null如果没有找到
 */
export function findPreviousJSONFile(excludeFileName = null) {
	// excludeFileName: 排除的文件名, not include extension

	const collectionDir = path.join(__dirPath, 'collection');

	if (!fs.existsSync(collectionDir)) {
		console.log('Collection目录不存在，正在创建...');
		fs.mkdirSync(collectionDir, { recursive: true });
	}
	console.log('正在查找最新的JSON文件...');

	const excludeBasename = excludeFileName
		? `${path.basename(excludeFileName)}.json`
		: null;

	const files = fs
		.readdirSync(collectionDir)
		.filter(
			(f) =>
				f.includes('adidas') &&
				f.includes('extra') &&
				f.includes('sale') &&
				f.endsWith('.json') &&
				f !== excludeBasename
		)
		.map((f) => {
			const timestamp = extractTimestampFromFilename(f);
			return {
				name: f,
				timestamp: timestamp,
			};
		})
		.filter((f) => {
			if (f.timestamp) {
				console.log(
					`文件: ${f.name}, 时间: ${f.timestamp.toISOString()}`
				);
				return true;
			} else {
				console.log(`跳过无效时间戳的文件: ${f.name}`);
				return false;
			}
		})
		.sort((a, b) => b.timestamp - a.timestamp); // 按时间降序排列，最新的在前

	if (files.length >= 1) {
		console.log(`找到上一个收集的文件: ${files[0]}`);
		return files[0].name;
	} else {
		console.log('没有找到任何文件，这应该是第一次运行');
		return null;
	}
}

// 从文件名中提取时间戳
function extractTimestampFromFilename(filename) {
	// 文件名格式: adidas-extra-sale-products_2025-10-05_07-41-45.json
	// 支持 .json 扩展名
	// 匹配格式: adidas-extra-sale-products_yyyy-mm-dd_hh-mm-ss.json
	let match = filename.match(
		/adidas[_-]extra[_-]sale[_-]products_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.json/
	);
	if (match) {
		// 格式: 2025-10-05_07-41-45，转换为标准时间格式
		const dateStr = match[1];
		const timeStr = `${match[2]}:${match[3]}:${match[4]}`;
		return new Date(`${dateStr}T${timeStr}`);
	}

	console.log('无法匹配文件名格式:', filename);
	return null;
}

// 生成带价格比较的HTML
function generateHTMLWithPriceComparison(
	products,
	dateTimeString,
	previousDateTime = null,
	removedProducts = []
) {
	return `<!DOCTYPE html>
    <html lang="ko">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adidas Extra Sale Products</title>
    <style>
        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        }
        body {
        font-family: Arial, sans-serif;
        padding: 20px;
        background-color: #f5f5f5;
        }
        .container {
        max-width: 1200px;
        margin: 0 auto;
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
        text-align: center;
        margin-bottom: 10px;
        color: #333;
        }
        .datetime {
        text-align: center;
        color: #666;
        margin-bottom: 30px;
        font-size: 14px;
        }
        .table {
        display: flex;
        flex-direction: column;
        gap: 1px;
        background-color: #ddd;
        border-radius: 4px;
        overflow: hidden;
        }
        .row {
        display: flex;
        background-color: white;
        }
        .row.header {
        background-color: #000;
        color: white;
        font-weight: bold;
        }
        .row.price-dropped {
        background-color: #ffeb3b;
        }
        .row.price-increased {
        background-color: #ffcdd2;
        }
        .row.new-item {
        background-color: #c8e6c9;
        }
        .row:hover:not(.header) {
        opacity: 0.8;
        }
        .cell {
        padding: 12px;
        display: flex;
        align-items: center;
        }
        .cell:nth-child(1) { flex: 0 0 50px; }
        .cell:nth-child(2) { flex: 2; }
        .cell:nth-child(3) { flex: 1; }
        .cell:nth-child(4) { flex: 1; }
        .cell:nth-child(5) { flex: 1; }
        .cell:nth-child(6) { flex: 1; word-break: break-all; }
        .cell a {
        color: #0066cc;
        text-decoration: none;
        }
        .cell:nth-child(3) {
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s;
        }
        .cell:nth-child(3):hover {
            background-color: #0066cc;
            color: #fff;
        }

        .cell a:hover {
        text-decoration: underline;
        }

        .cell .wrap {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .price-info {
        display: flex;
        flex-direction: column;
        }
        .previous-price {
        text-decoration: line-through;
        color: #999;
        font-size: 12px;
        }
        .price-drop-badge {
        background-color: #f44336;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        }
        .price-increase-badge {
        background-color: #e91e63;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        }
        .new-item-badge {
        background-color: #4caf50;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        margin-left: 8px;
        }

        .extra-30-badge > span {
        background-color: #4caf50;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        }

        .extra-30-badge > span.new {
        background-color: #e91e63;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        margin-left: 8px;
        }

        .price-gap {
        color: #f44336;
        font-weight: bold;
        margin-left: 8px;
        font-size: 12px;
        }
        .price-gap.increase {
        color: #e91e63;
        }
        .removed-section {
        margin-top: 30px;
        padding: 15px;
        background-color: #fff3e0;
        border-radius: 4px;
        }
        .removed-section h2 {
        font-size: 16px;
        margin-bottom: 10px;
        color: #e65100;
        }
        .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        justify-content: center;
        align-items: center;
        }
        .modal.show {
        display: flex;
        }
        .modal-content {
        position: relative;
        max-width: 90%;
        max-height: 90%;
        }
        .modal-content img {
        max-width: 100%;
        max-height: 90vh;
        border-radius: 8px;
        }
        .modal-close {
        position: absolute;
        top: -40px;
        right: 0;
        color: white;
        font-size: 40px;
        font-weight: bold;
        cursor: pointer;
        }
        .modal-close:hover {
        color: #ccc;
        }
        .sticky {
            position: sticky;
            top: 0;
            z-index: 100;
            background-color: white;
        }

        /* Filter controls styling */
        .filter-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 20px;
        padding: 16px;
        background-color: #f8f9fa;
        border-radius: 8px;
        flex-wrap: wrap;
        }

        button {
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        border: 2px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: Arial, sans-serif;
        outline: none;
        }

        button:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        button:first-of-type {
        background-color: #4caf50;
        color: white;
        border-color: #4caf50;
        }

        button:first-of-type:hover {
        background-color: #45a049;
        border-color: #45a049;
        }

        button:nth-of-type(2),
        button:nth-of-type(3) {
        background-color: #ff9800;
        color: white;
        border-color: #ff9800;
        }

        button:nth-of-type(2):hover,
        button:nth-of-type(3):hover {
        background-color: #e68900;
        border-color: #e68900;
        }

        /* Active state for filter buttons */
        button.active {
        box-shadow: inset 0 3px 8px rgba(0,0,0,0.3);
        transform: scale(0.98);
        font-weight: 700;
        }

        button:first-of-type.active {
        background-color: #2e7d32;
        border-color: #2e7d32;
        }

        button:nth-of-type(2).active,
        button:nth-of-type(3).active {
        background-color: #d68000;
        border-color: #d68000;
        }

        #exchangeRate {
        padding: 10px 16px;
        font-size: 14px;
        border: 2px solid #ddd;
        border-radius: 6px;
        outline: none;
        transition: all 0.3s ease;
        min-width: 200px;
        font-family: Arial, sans-serif;
        }

        #exchangeRate:focus {
        border-color: #2196f3;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        #exchangeRate::placeholder {
        color: #999;
        }

        .price-rmb {
            color: #ff0000;
        }
    </style>
        <script>
        function calculateExchangeRate() {
                var rateInput = document.getElementById('exchangeRate');
                var rate = parseFloat(rateInput.value);
                console.log(rate);
                if (rate <= 0) {
                    alert('请输入有效的汇率数字');
                    return;
                }
                else if (isNaN(rate)) {
                    return;
                }

                var rows = document.querySelectorAll('.row:not(.header)');
                rows.forEach(function(row) {
                    var priceCell = row.querySelector('.price-krw');
                    if (priceCell) {
                        var priceText = priceCell.childNodes[0].nodeValue.trim();
                        var priceMatch = priceText.match(/([\\d,]+)\\s*원/);
                        if (priceMatch) {
                            var priceKRW = parseInt(priceMatch[1].replace(/,/g, ''));
                            var isExtra30Off = row.querySelector('.extra-30-badge') !== null;
                            var priceRMB = (priceKRW * (isExtra30Off ? 0.7 : 1) / rate).toFixed(2);
                            var rmbSpan = row.querySelector('.price-rmb span');
                            if (rmbSpan) {
                                rmbSpan.textContent = priceRMB + ' 元';
                            }
                        }
                    }
                });
            }

            // Track current filter state
            var currentFilter = null; // 'new', 'drop', 'newExtra30', or null (show all)

            // 清除所有按钮的active状态
            function clearAllActiveButtons() {
                var allButtons = [
                    document.getElementById('btnNew'),
                    document.getElementById('btnDrop'),
                    document.getElementById('btnNewExtra30Off')
                ];
                for (var i = 0; i < allButtons.length; i++) {
                    if (allButtons[i]) {
                        allButtons[i].classList.remove('active');
                    }
                }
            }

            // 显示所有行
            function showAllRows() {
                var rows = document.querySelectorAll('.row:not(.header)');
                for (var i = 0; i < rows.length; i++) {
                    rows[i].style.display = 'flex';
                }
            }

            function filterNew() {
                var rows = document.querySelectorAll('.row:not(.header)');

                if (currentFilter === 'new') {
                    // 当前过滤器已激活，点击则关闭
                    currentFilter = null;
                    clearAllActiveButtons();
                    showAllRows();
                } else {
                    // 激活新产品过滤器
                    currentFilter = 'new';
                    clearAllActiveButtons();
                    document.getElementById('btnNew').classList.add('active');

                    for (var i = 0; i < rows.length; i++) {
                        if (rows[i].classList.contains('new-item')) {
                            rows[i].style.display = 'flex';
                        } else {
                            rows[i].style.display = 'none';
                        }
                    }
                }
            }

            function filterDrop() {
                var rows = document.querySelectorAll('.row:not(.header)');

                if (currentFilter === 'drop') {
                    // 当前过滤器已激活，点击则关闭
                    currentFilter = null;
                    clearAllActiveButtons();
                    showAllRows();
                } else {
                    // 激活降价过滤器
                    currentFilter = 'drop';
                    clearAllActiveButtons();
                    document.getElementById('btnDrop').classList.add('active');

                    for (var i = 0; i < rows.length; i++) {
                        if (rows[i].classList.contains('price-dropped')) {
                            rows[i].style.display = 'flex';
                        } else {
                            rows[i].style.display = 'none';
                        }
                    }
                }
            }

            function filterNewExtra30Off() {
                var rows = document.querySelectorAll('.row:not(.header)');

                if (currentFilter === 'newExtra30') {
                    // 当前过滤器已激活，点击则关闭
                    currentFilter = null;
                    clearAllActiveButtons();
                    showAllRows();
                } else {
                    // 激活新增30%折扣过滤器
                    currentFilter = 'newExtra30';
                    clearAllActiveButtons();
                    document.getElementById('btnNewExtra30Off').classList.add('active');

                    for (var i = 0; i < rows.length; i++) {
                        var extra30Badge = rows[i].querySelector('.extra-30-badge');
                        var hasNewBadge = extra30Badge && extra30Badge.querySelector('.new') !== null;
                        if (hasNewBadge) {
                            rows[i].style.display = 'flex';
                        } else {
                            rows[i].style.display = 'none';
                        }
                    }
                }
            }
            
            function showImage(imageUrl) {
                var modal = document.getElementById('imageModal');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'imageModal';
                    modal.className = 'modal';
                    modal.innerHTML = '<div class="modal-content"><span class="modal-close" onclick="closeModal()">&times;</span><img id="modalImage" src="" alt="Product Image"/></div>';
                    document.body.appendChild(modal);
                }
                
                document.getElementById('modalImage').src = imageUrl;
                modal.classList.add('show');
            }

            function closeModal() {
                var modal = document.getElementById('imageModal');
                if (modal) {
                    modal.classList.remove('show');
                }
            }

            function copyCode(element) {
                // Get the text content of the clicked element
                const code = element.textContent.trim();

                // Use modern Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(function() {
                        // Show visual feedback - clear any existing timeout first
                        if (element.copyTimeout) {
                            clearTimeout(element.copyTimeout);
                        }
                        element.style.backgroundColor = '#4caf50';
                        element.style.transition = 'background-color 0.3s';
                        element.copyTimeout = setTimeout(function() {
                            // Clear inline style to let CSS take over
                            element.style.backgroundColor = '';
                            delete element.copyTimeout;
                        }, 500);
                    }).catch(function(err) {
                        console.error('Failed to copy:', err);
                        alert('复制失败');
                    });
                } else {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = code;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        // Show visual feedback - clear any existing timeout first
                        if (element.copyTimeout) {
                            clearTimeout(element.copyTimeout);
                        }
                        element.style.backgroundColor = '#4caf50';
                        element.copyTimeout = setTimeout(function() {
                            // Clear inline style to let CSS take over
                            element.style.backgroundColor = '';
                            delete element.copyTimeout;
                        }, 500);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                        alert('复制失败');
                    }
                    document.body.removeChild(textarea);
                }
            }

            document.addEventListener('click', function(event) {
                var modal = document.getElementById('imageModal');
                if (modal && event.target === modal) {
                    closeModal();
                }
            });
        </script>
    </head>
    <body>
    <div class="container">
        <h1>------ Adidas Extra Sale ------</h1>
        <div class="datetime">抓取时间: ${dateTimeString}${
			previousDateTime ? `<br/>上一次抓取时间: ${previousDateTime}` : ''
		}
        </div>

        <div class="sticky filter-controls">
            <button id="btnNew" onclick="filterNew()">新品</button>
            <button id="btnDrop" onclick="filterDrop()">降价品</button>
            <button id="btnNewExtra30Off" onclick="filterNewExtra30Off()">New 30%</button>
            <input
            type="text"
            id="exchangeRate"
            placeholder="输入汇率 (例: 196)"
            onblur="calculateExchangeRate()"
            onkeypress="if(event.key === 'Enter') calculateExchangeRate()"
            />
        </div>

        <div class="table">
            <div class="row header">
                <div class="cell">#</div>
                <div class="cell">Name</div>
                <div class="cell">Code</div>
                <div class="cell">Price</div>
                <div class="cell">Extra 30%</div>
                <div class="cell">URL</div>
            </div>
            ${products
				.map(
					(p, i) => `                    <div class="row${
						p.isPriceDropped
							? ' price-dropped'
							: p.isPriceIncreased
								? ' price-increased'
								: p.isNewItem
									? ' new-item'
									: ''
					}">
                        <div class="cell">${i + 1}</div>
                        <div class="cell">
                            <img
                            width="100px" height="100px" 
                            src="${p.imageUrl}" alt="" onclick="showImage('${p.imageUrl}')">
                            &nbsp;&nbsp;
                            <span class="product-name">
                                ${p.name}
                                ${
									p.isNewItem
										? ' <span class="new-item-badge">新产品!</span>'
										: ''
								}
                            </span>
                        </div>
                        <div class="cell" onclick="copyCode(this)">${p.code}</div>
                        <div class="cell">
                            <div class="price-info">
                                ${
									p.isPriceDropped || p.isPriceIncreased
										? `<div class="previous-price">${p.previousPrice}</div>`
										: ''
								}
                                <div>
                                    <div class="price-krw">${p.price}</div>
                                    ${
										p.isPriceDropped
											? `<span class="price-drop-badge">降价!</span><span class="price-gap">-${p.priceGap}</span>`
											: p.isPriceIncreased
												? `<span class="price-increase-badge">涨价!</span><span class="price-gap increase">+${p.priceGap}</span>`
												: ''
									}
                                </div>
                            </div>
                        </div>

                        <div class="cell">
                            <div class="wrap">
                                ${
									p.isExtra30Off
										? `<div class="extra-30-badge"><span>Extra 30% OFF</span>
                                        ${
											p.isNewExtra30Off
												? '<span class="new">New!</span>'
												: ''
										}</div>`
										: ''
								}
                                <div class="price-krw-30">
                                ${
									p.isExtra30Off
										? (() => {
												const priceMatch =
													p.price.match(
														/([\d,]+)\s*원/
													);
												if (priceMatch) {
													const priceNum = parseInt(
														priceMatch[1].replace(
															/,/g,
															''
														)
													);
													const discountedPrice =
														Math.round(
															priceNum * 0.7
														);
													return `<span>${discountedPrice.toLocaleString('ko-KR')} 원</span>`;
												}
												return `<span>${p.price}</span>`;
											})()
										: `<span>${p.price}</span>`
								}
                                </div>
                                <div class="price-rmb">RMB: <span></span></div>
                            </div>
                        </div>
                        
                        <div class="cell"><a href="${p.url}" target="_blank"><button>查看官网</button></a></div>
                    </div>`
				)
				.join('\n')}
        </div>
        ${
			removedProducts.length > 0
				? `
        <div class="removed-section">
            <h2>已下架产品 (${removedProducts.length} 件)</h2>
            <ul>
        ${removedProducts.map((p) => `                <li>${p.code} - ${p.price}</li>`).join('\n')}
            </ul>
        </div>`
				: ''
		}
    </div>

    <!-- Modal -->
    <div id="imageModal" class="modal" onclick="closeModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
        <span class="modal-close" onclick="closeModal()">&times;</span>
        <img id="modalImage" src="" alt="Product Image">
        </div>
    </div>

    <script>
        function showImage(imageUrl) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        modal.classList.add('show');
        modalImg.src = imageUrl;
        }

        function closeModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('show');
        }

        // ESC键关闭模态框
        document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
        });
    </script>
    </body>
</html>`;
}

export async function comparePrice(currentFileName, prevFileName) {
	// fileName not include extension
	// fileName = 最新抓取的文件, 如: adidas-extra-sale-products_2025-10-05_07-41-45
	// 查找最新的已保存文件并与当前抓取的数据进行价格比较
	console.log('\n检查之前的文件以进行价格比较...');

	if (prevFileName) {
		console.log(`当前新抓取的数据将与之前的文件比较: ${prevFileName}`);

		// prevFileName 已经包含扩展名,如: adidas-extra-sale-products_2025-10-16_23-06-51.json
		const prevFilePath = `collection/${prevFileName}`;
		const previousProductFile = fs.readFileSync(prevFilePath, 'utf-8');
		const previousProductData = JSON.parse(previousProductFile);

		// currentFileName 已经包含 collection/ 前缀且不包含扩展名,只需添加 .json
		const currentFilePath = `${currentFileName}.json`;
		const currentProductFile = fs.readFileSync(currentFilePath, 'utf-8');
		const currentProductData = JSON.parse(currentProductFile);

		// 提取之前文件的产品信息
		// const previousProducts = extractProductsFromHTML(
		// 	path.join(__dirPath, previousFilePath)
		// );

		if (previousProductData) {
			console.log(
				`从 ${prevFileName} 中提取了 ${Object.keys(previousProductData.products).length} 个产品`
			);
			console.log('\n开始比较价格...');

			let priceDropCount = 0;
			// 标记降价产品 - 比较当前抓取的数据与最新已保存文件的价格
			Object.values(currentProductData.products).forEach(
				(product, index) => {
					const currentPriceStr =
						product.price.match(/([\d,]+)\s*원/);
					if (currentPriceStr) {
						const currentPrice = parseInt(
							currentPriceStr[1].replace(/,/g, '')
						);
						const previousProductInfo =
							previousProductData.products[product.code];
						const previousPriceStr =
							previousProductInfo?.price?.match(/([\d,]+)\s*원/);
						const previousPrice = previousPriceStr
							? parseInt(previousPriceStr[1].replace(/,/g, ''))
							: null;
						const previousIsExtra30Off =
							previousProductInfo?.isExtra30Off || false;

						// 调试日志 - 只显示前5个产品
						if (index < 5) {
							console.log(
								`\n产品 ${index + 1}: ${product.code} - ${product.name}`
							);
							console.log(
								`  当前价格: ${currentPrice.toLocaleString()}`
							);
							console.log(
								`  之前价格: ${
									previousPrice
										? previousPrice.toLocaleString()
										: '未找到'
								}`
							);
							console.log(
								`  价格下降: ${
									previousPrice &&
									currentPrice < previousPrice
										? '是'
										: '否'
								}`
							);
						}

						if (!previousPrice) {
							// 新产品
							product.isNewItem = true;
							console.log(
								`✓ 新产品: ${product.code} - ${
									product.name
								}: ${currentPrice.toLocaleString()} 원`
							);
						} else if (currentPrice < previousPrice) {
							// 价格下降
							product.isPriceDropped = true;
							product.previousPrice =
								previousPrice.toLocaleString() + ' 원';
							product.priceGap =
								(
									previousPrice - currentPrice
								).toLocaleString() + ' 원';
							priceDropCount++;
							console.log(
								`✓ 价格下降: ${product.code} - ${
									product.name
								}: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (降了 ${
									product.priceGap
								})`
							);
						} else if (currentPrice > previousPrice) {
							// 价格上涨
							product.isPriceIncreased = true;
							product.previousPrice =
								previousPrice.toLocaleString() + ' 원';
							product.priceGap =
								(
									currentPrice - previousPrice
								).toLocaleString() + ' 원';
							console.log(
								`✓ 价格上涨: ${product.code} - ${
									product.name
								}: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (涨了 ${
									product.priceGap
								})`
							);
						}

						// 新增额外30%折扣标记
						if (!previousIsExtra30Off) {
							product.isNewExtra30Off =
								product.isExtra30Off || false;
						}
					} else {
						if (index < 5) {
							console.log(
								`\n产品 ${index + 1}: ${product.code} - 价格格式无法匹配: "${
									product.price
								}"`
							);
						}
					}
				}
			);

			// 查找已下架的产品
			const removedProducts = [];
			const currentCodes = new Set(
				Object.keys(currentProductData.products)
			);
			Object.entries(previousProductData.products).forEach(
				([code, productInfo]) => {
					if (!currentCodes.has(code)) {
						removedProducts.push({
							code: code,
							price: productInfo.price,
						});
						console.log(`✓ 已下架: ${code}: ${productInfo.price}`);
					}
				}
			);

			// 统计摘要
			const uniqueProducts = Object.values(currentProductData.products);
			const newItemCount = uniqueProducts.filter(
				(p) => p.isNewItem
			).length;
			const priceIncreaseCount = uniqueProducts.filter(
				(p) => p.isPriceIncreased
			).length;

			console.log(`\n=== 价格比较摘要 ===`);
			console.log(`价格下降: ${priceDropCount} 件`);
			console.log(`价格上涨: ${priceIncreaseCount} 件`);
			console.log(`新产品: ${newItemCount} 件`);
			console.log(`已下架: ${removedProducts.length} 件`);
			console.log(`==================\n`);

			// 直接从JSON数据中获取日期时间字符串,不需要从文件名解析
			const previousDateTimeString = previousProductData.dateTimeString;
			const dateTimeString = currentProductData.dateTimeString;

			// 重新生成HTML，包含价格比较信息
			const htmlContentWithComparison = generateHTMLWithPriceComparison(
				uniqueProducts,
				dateTimeString,
				previousDateTimeString,
				removedProducts
			);
			const htmlFileName = `${currentFileName}.html`;
			fs.writeFileSync(htmlFileName, htmlContentWithComparison, 'utf8');
			console.log(`\n产品信息已保存到 ${htmlFileName} (包含价格比较)`);

			// 生成 Excel 文件
			// await generateExcel(
			// 	uniqueProducts,
			// 	fileName,
			// 	dateTimeString,
			// 	previousDateTimeString,
			// 	removedProducts
			// );

			// await sendEmailToSubscribers(currentFileName);
		} else {
			console.log('无法从之前的文件中提取价格信息');
			const uniqueProducts = Object.values(currentProductData.products);
			const dateTimeString = currentProductData.dateTimeString;
			const htmlContent = generateHTMLWithPriceComparison(
				uniqueProducts,
				dateTimeString
			);
			const htmlFileName = `${currentFileName}.html`;
			fs.writeFileSync(htmlFileName, htmlContent, 'utf8');
			console.log(`\n产品信息已保存到 ${htmlFileName}`);

			// 生成 Excel 文件
			// await generateExcel(uniqueProducts, fileName, dateTimeString);
		}
	} else {
		console.log('未找到之前的文件进行价格比较（这可能是第一次运行）');
		// 读取当前产品数据
		const currentFilePath = `collection/${currentFileName}.json`;
		const currentProductFile = fs.readFileSync(currentFilePath, 'utf-8');
		const currentProductData = JSON.parse(currentProductFile);

		const uniqueProducts = Object.values(currentProductData.products);
		const dateTimeString = currentProductData.dateTimeString;
		const htmlContent = generateHTMLWithPriceComparison(
			uniqueProducts,
			dateTimeString
		);
		const htmlFileName = `${currentFileName}.html`;
		fs.writeFileSync(htmlFileName, htmlContent, 'utf8');
		console.log(`\n产品信息已保存到 ${htmlFileName}`);

		// 生成 Excel 文件
		// await generateExcel(uniqueProducts, fileName, dateTimeString);
	}
}
