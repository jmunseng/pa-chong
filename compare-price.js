import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从HTML文件中提取产品价格数据
function extractPricesFromHTML(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    return null;
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const priceMap = new Map();

  // Optimized regex: Use negative lookahead to limit search within row boundaries
  // Product codes: 1-2 letters followed by 4+ digits (e.g., M18209, IE3679, ID2704)
  // (?:(?!<div class="row\").){0,300}? limits search to current row only
  const rowRegex =
    /<div class="cell">([A-Z]{1,2}[0-9]{4,})<\/div>(?:(?!<div class="row").){0,300}?([\d,]+)\s*원/gs;

  let match;
  while ((match = rowRegex.exec(htmlContent)) !== null) {
    const code = match[1];
    const priceStr = match[2];
    const price = parseInt(priceStr.replace(/,/g, ''));
    priceMap.set(code, price);
  }

  return priceMap;
}

// 从HTML文件中提取完整产品信息（代码、名称、价格）
function extractProductsFromHTML(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    return null;
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const productsMap = new Map();

  // Optimized regex: Use negative lookahead to limit search within row boundaries
  // Product codes: 1-2 letters followed by 4+ digits (e.g., M18209, IE3679, ID2704)
  const rowRegex =
    /<span class="product-name"[^>]*>([^<]+)<\/span>(?:(?!<div class="row").){0,500}?<div class="cell">([A-Z]{1,2}[0-9]{4,})<\/div>(?:(?!<div class="row").){0,300}?([\d,]+)\s*원/gs;

  let match;
  while ((match = rowRegex.exec(htmlContent)) !== null) {
    const name = match[1].trim();
    const code = match[2];
    const priceStr = match[3];
    const price = parseInt(priceStr.replace(/,/g, ''));
    productsMap.set(code, { name, price });
  }

  return productsMap;
}

// 查找最新的两个HTML文件
function findLatestTwoFiles(excludeFileName = null) {
  const collectionDir = path.join(__dirname, 'collection');

  if (!fs.existsSync(collectionDir)) {
    console.log('Collection目录不存在');
    return null;
  }

  console.log('正在查找最新的两个HTML文件...');

  const excludeBasename = excludeFileName
    ? path.basename(excludeFileName)
    : null;

  const files = fs
    .readdirSync(collectionDir)
    .filter(
      (f) =>
        f.includes('adidas') &&
        f.includes('extra') &&
        f.includes('sale') &&
        f.endsWith('.html') &&
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
        console.log(`文件: ${f.name}, 时间: ${f.timestamp.toISOString()}`);
        return true;
      } else {
        console.log(`跳过无效时间戳的文件: ${f.name}`);
        return false;
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp); // 按时间降序排列，最新的在前

  if (files.length >= 1) {
    console.log(`找到最新的文件: ${files[0].name}`);
    if (files.length >= 2) {
      console.log(`找到第二新的文件: ${files[1].name}`);
    }
    return {
      latest: path.join('collection', files[0].name),
      previous:
        files.length >= 2 ? path.join('collection', files[1].name) : null,
    };
  } else {
    console.log('没有找到任何文件，这应该是第一次运行');
    return null;
  }
}

// 从文件名中提取时间戳
function extractTimestampFromFilename(filename) {
  // 文件名格式: adidas-extra-sale-products_2025-10-05_07-41-45.html
  // 匹配两种格式：
  // 1. adidas-extra-sale-products_yyyy-mm-dd_hh-mm-ss
  // 2. adidas-extra-sale-products_yyyy-mm-dd_hh-mm-ss

  // 先尝试匹配冒号分隔的时间格式
  let match = filename.match(
    /adidas[_-]extra[_-]sale[_-]products_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.html/
  );
  if (match) {
    // 格式: 2025-10-05_05-45-54
    const dateStr = match[1];
    const timeStr = `${match[2]}:${match[3]}:${match[4]}`;
    return new Date(`${dateStr}T${timeStr}`);
  }

  // 再尝试匹配短横线分隔的时间格式
  match = filename.match(
    /adidas[_-]extra[_-]sale[_-]products_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.html/
  );
  if (match) {
    // 格式: 2025-10-05_07:41:45，需要转换为标准时间格式
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
    .cell:nth-child(5) { flex: 2; word-break: break-all; }
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
    .product-name {
      cursor: pointer;
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

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
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

    button:nth-of-type(2) {
      background-color: #ff9800;
      color: white;
      border-color: #ff9800;
    }

    button:nth-of-type(2):hover {
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

    button:nth-of-type(2).active {
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
        var currentFilter = null; // 'new', 'drop', or null (show all)

        function filterNew() {
            var btn = document.getElementById('btnNew');
            var btnDrop = document.getElementById('btnDrop');
            var rows = document.querySelectorAll('.row:not(.header)');

            if (currentFilter === 'new') {
                // Toggle off - show all
                currentFilter = null;
                btn.classList.remove('active');
                for (var i = 0; i < rows.length; i++) {
                    rows[i].style.display = 'flex';
                }
            } else {
                // Toggle on - filter new items
                currentFilter = 'new';
                btn.classList.add('active');
                btnDrop.classList.remove('active');
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
            var btn = document.getElementById('btnDrop');
            var btnNew = document.getElementById('btnNew');
            var rows = document.querySelectorAll('.row:not(.header)');

            if (currentFilter === 'drop') {
                // Toggle off - show all
                currentFilter = null;
                btn.classList.remove('active');
                for (var i = 0; i < rows.length; i++) {
                    rows[i].style.display = 'flex';
                }
            } else {
                // Toggle on - filter dropped items
                currentFilter = 'drop';
                btn.classList.add('active');
                btnNew.classList.remove('active');
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i].classList.contains('price-dropped')) {
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
                    // Show visual feedback
                    const originalBg = element.style.backgroundColor;
                    element.style.backgroundColor = '#4caf50';
                    element.style.transition = 'background-color 0.3s';
                    setTimeout(function() {
                        element.style.backgroundColor = originalBg;
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
                    // Show visual feedback
                    const originalBg = element.style.backgroundColor;
                    element.style.backgroundColor = '#4caf50';
                    setTimeout(function() {
                        element.style.backgroundColor = originalBg;
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
  }</div>

    <div class="sticky filter-controls">
        <button id="btnNew" onclick="filterNew()">🆕 新品</button>
        <button id="btnDrop" onclick="filterDrop()">📉 降价品</button>
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
        <div class="cell">URL</div>
      </div>
${products
  .map(
    (p, i) => `      <div class="row${
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
            <span class="product-name">
                ${p.name}
                ${
                  p.isNewItem
                    ? ' <span class="new-item-badge">新产品!</span>'
                    : ''
                }
            </span>
            <img
            width="100px" height="100px" 
            src="${p.imageUrl}" alt="" onclick="showImage('${p.imageUrl}')">
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
              <div class="price-rmb">人民币: <span></span></div>
            </div>
          </div>
        </div>
        <div class="cell"><a href="${p.url}" target="_blank">${p.url}</a></div>
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
${removedProducts
  .map((p) => `        <li>${p.name} (${p.code}) - ${p.price}</li>`)
  .join('\n')}
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

export function comparePrice(
  uniqueProducts,
  fileName,
  htmlContent,
  dateTimeString
) {
  // 查找最新的已保存文件并与当前抓取的数据进行价格比较
  console.log('\n检查之前的文件以进行价格比较...');
  const fileInfo = findLatestTwoFiles(fileName);

  if (fileInfo) {
    console.log(`当前新抓取的数据将与之前的文件比较: ${fileInfo.latest}`);

    // 提取最新文件的价格和完整产品信息
    const previousPrices = extractPricesFromHTML(
      path.join(__dirname, fileInfo.latest)
    );
    const previousProducts = extractProductsFromHTML(
      path.join(__dirname, fileInfo.latest)
    );

    if (previousPrices && previousProducts) {
      console.log(
        `从 ${fileInfo.latest} 中提取了 ${previousPrices.size} 个产品价格`
      );
      console.log('\n开始比较价格...');

      let priceDropCount = 0;
      // 标记降价产品 - 比较当前抓取的数据与最新已保存文件的价格
      uniqueProducts.forEach((product, index) => {
        const currentPriceStr = product.price.match(/([\d,]+)\s*원/);
        if (currentPriceStr) {
          const currentPrice = parseInt(currentPriceStr[1].replace(/,/g, ''));
          const previousPrice = previousPrices.get(product.code);

          // 调试日志 - 只显示前5个产品
          if (index < 5) {
            console.log(
              `\n产品 ${index + 1}: ${product.code} - ${product.name}`
            );
            console.log(`  当前价格: ${currentPrice.toLocaleString()}`);
            console.log(
              `  之前价格: ${
                previousPrice ? previousPrice.toLocaleString() : '未找到'
              }`
            );
            console.log(
              `  价格下降: ${
                previousPrice && currentPrice < previousPrice ? '是' : '否'
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
            product.previousPrice = previousPrice.toLocaleString() + ' 원';
            product.priceGap =
              (previousPrice - currentPrice).toLocaleString() + ' 원';
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
            product.previousPrice = previousPrice.toLocaleString() + ' 원';
            product.priceGap =
              (currentPrice - previousPrice).toLocaleString() + ' 원';
            console.log(
              `✓ 价格上涨: ${product.code} - ${
                product.name
              }: ${previousPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (涨了 ${
                product.priceGap
              })`
            );
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
      });

      // 查找已下架的产品
      const removedProducts = [];
      const currentCodes = new Set(uniqueProducts.map((p) => p.code));
      previousProducts.forEach((productInfo, code) => {
        if (!currentCodes.has(code)) {
          removedProducts.push({
            code: code,
            name: productInfo.name,
            price: productInfo.price.toLocaleString() + ' 원',
          });
          console.log(
            `✓ 已下架: ${code} - ${
              productInfo.name
            }: ${productInfo.price.toLocaleString()} 원`
          );
        }
      });

      // 统计摘要
      const newItemCount = uniqueProducts.filter((p) => p.isNewItem).length;
      const priceIncreaseCount = uniqueProducts.filter(
        (p) => p.isPriceIncreased
      ).length;

      console.log(`\n=== 价格比较摘要 ===`);
      console.log(`价格下降: ${priceDropCount} 件`);
      console.log(`价格上涨: ${priceIncreaseCount} 件`);
      console.log(`新产品: ${newItemCount} 件`);
      console.log(`已下架: ${removedProducts.length} 件`);
      console.log(`==================\n`);

      // 重新生成HTML，包含价格比较信息
      const previousDateTime = extractTimestampFromFilename(
        path.basename(fileInfo.latest)
      );
      const previousDateTimeString = previousDateTime
        ? previousDateTime.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : null;
      const htmlContentWithComparison = generateHTMLWithPriceComparison(
        uniqueProducts,
        dateTimeString,
        previousDateTimeString,
        removedProducts
      );
      fs.writeFileSync(fileName, htmlContentWithComparison, 'utf8');
      console.log(`\n产品信息已保存到 ${fileName} (包含价格比较)`);
    } else {
      console.log('无法从之前的文件中提取价格信息');
      fs.writeFileSync(fileName, htmlContent, 'utf8');
      console.log(`\n产品信息已保存到 ${fileName}`);
    }
  } else {
    console.log('未找到之前的文件进行价格比较（这可能是第一次运行）');
    fs.writeFileSync(fileName, htmlContent, 'utf8');
    console.log(`\n产品信息已保存到 ${fileName}`);
  }
}
