// 生成带价格比较的HTML

import { E_BrandOption } from '../../enum/enum-musinsa';
import { RemovedProduct } from '../../types/musinsa-product';
import { MusinsaProduct } from '../../types/musinsa-product';

/**
 * 生成 Musinsa HTML 内容
 * @param e_brandOption - 品牌选项
 * @param products - 产品列表
 * @param dateTimeString - 当前日期时间字符串
 * @param previousDateTime - 上一次抓取的日期时间字符串(可选)
 * @param removedProducts - 已下架产品列表(可选)
 * @returns HTML 内容字符串
 */

export function generateMusinsaHTMLContent(
	e_brandOption: E_BrandOption,
	products: MusinsaProduct[],
	dateTimeString: string,
	previousDateTime: string | null = null,
	removedProducts: RemovedProduct[] = []
) {
	return `<!DOCTYPE html>
    <html lang="ko">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${e_brandOption} Extra Sale Products</title>
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
                            var priceRMB = (priceKRW / rate).toFixed(2);
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
        <h1>------ Musinsa ${e_brandOption} Extra Sale ------</h1>
        <div class="datetime">抓取时间: ${dateTimeString}${previousDateTime ? `<br/>上一次抓取时间: ${previousDateTime}` : ''}
        </div>

        <div class="sticky filter-controls">
            <button id="btnNew" onclick="filterNew()">新品</button>
            <button id="btnDrop" onclick="filterDrop()">降价品</button>
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
                <div class="cell">RMB</div>
                <div class="cell">URL</div>
            </div>
            ${products
				.map(
					(p, i) => `                    <div class="row${
						p.isPriceDropped ? ' price-dropped' : p.isPriceIncreased ? ' price-increased' : p.isNewItem ? ' new-item' : ''
					}">
                        <div class="cell">${i + 1}</div>
                        <div class="cell">
                            <img
                            width="100px" height="100px" 
                            src="${p.thumbnail}" alt="" onclick="showImage('${p.thumbnail}')">
                            &nbsp;&nbsp;
                            <span class="product-name">
                                ${p.goodsName}
                                ${p.isNewItem ? ' <span class="new-item-badge">新产品!</span>' : ''}
                            </span>
                        </div>
                        <div class="cell" onclick="copyCode(this)">${p.code}</div>
                        <div class="cell">
                            <div class="price-info">
                                ${p.isPriceDropped || p.isPriceIncreased ? `<div class="previous-price">${p.previousPrice}</div>` : ''}
                                <div>
                                    <div class="price-krw">${p.price.toLocaleString('ko-KR')} 원</div>
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
                                <div class="price-rmb">RMB: <span></span></div>
                            </div>
                        </div>

                        <div class="cell"><a href="${p.goodsLinkUrl}" target="_blank"><button>查看官网</button></a></div>
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
        ${removedProducts.map((p) => `                <li>${p.code} - ${p.price.toLocaleString('ko-KR') + ' 원'}</li>`).join('\n')}
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
