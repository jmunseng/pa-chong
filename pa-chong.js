import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import { comparePrice } from './compare-price.js';

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

async function scrapeNikeProducts() {
  console.log('连接到现有浏览器...');

  // 连接到已打开的 Chrome 浏览器
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
    });
    console.log('成功连接到浏览器');
  } catch (err) {
    console.error('连接失败，请确保Chrome已启动并开启远程调试：');
    console.error(
      '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir="/Users/leon/Library/Application Support/Google/Chrome"'
    );
    throw err;
  }

  // 创建新标签页
  console.log('正在打开新标签页...');
  const page = await browser.newPage();

  console.log('正在访问网页...');

  // 访问目标网页
  const url = 'https://www.adidas.co.kr/extra_sale-shoes';

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  } catch (err) {
    if (err.message.includes('detached')) {
      console.log('页面被分离，重新获取页面...');
      const newPages = await browser.pages();
      page = newPages[newPages.length - 1];
    } else {
      throw err;
    }
  }

  console.log('等待产品加载...');

  // 等待页面加载
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 检查页面结构
  const pageInfo = await page.evaluate(() => {
    // 查找所有可能的产品容器
    const selectors = [
      '[data-testid="product-grid"]',
      '.product-grid',
      '[class*="product"]',
      '[class*="ProductGrid"]',
      'article',
      '[role="list"]',
    ];

    const results = {};
    selectors.forEach((sel) => {
      const elements = document.querySelectorAll(sel);
      results[sel] = elements.length;
    });

    // 获取body的主要子元素
    const bodyChildren = Array.from(document.body.children).map((el) => ({
      tag: el.tagName,
      id: el.id,
      classes: el.className,
    }));

    return {
      selectors: results,
      bodyChildren: bodyChildren.slice(0, 10),
      title: document.title,
    };
  });

  // console.log('页面信息:', JSON.stringify(pageInfo, null, 2));

  // 检查产品网格是否存在
  const hasProductGrid = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="product-grid"]');
    return !!grid;
  });

  console.log('产品网格是否存在:', hasProductGrid);

  if (!hasProductGrid) {
    console.log('未找到产品网格，尝试滚动页面加载内容...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // 等待产品网格加载
  try {
    await page.waitForSelector('[data-testid="product-grid"]', {
      timeout: 10000,
    });
    console.log('产品网格已加载');
  } catch (err) {
    console.log('产品网格加载超时，尝试直接提取...');
  }

  console.log('开始提取产品信息...');

  // 多页抓取
  let allProducts = [];
  let pageNum = 1;
  const itemsPerPage = 48;

  while (true) {
    console.log(`\n正在抓取第 ${pageNum} 页...`);

    // 等待产品加载
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 获取总页数信息
    const pageInfo = await page.evaluate(() => {
      const indicator = document.querySelector(
        '[data-testid="page-indicator"]'
      );
      if (indicator) {
        const text = indicator.textContent.trim();
        const match = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          return {
            current: parseInt(match[1]),
            total: parseInt(match[2]),
          };
        }
      }
      return null;
    });

    if (pageInfo) {
      console.log(`当前页: ${pageInfo.current} / ${pageInfo.total}`);
    }

    // 提取产品信息
    const products = await page.evaluate(() => {
      const productCards = document.querySelectorAll(
        '[data-testid="plp-product-card"]'
      );
      const productList = [];

      productCards.forEach((card) => {
        const link = card.querySelector(
          'a[data-testid="product-card-description-link"]'
        );
        const href = link?.getAttribute('href') || '';
        const codeMatch = href.match(/\/([A-Z0-9]+)\.html/);
        const code = codeMatch ? codeMatch[1] : '';

        // 构建完整URL
        const url = href ? `https://www.adidas.co.kr${href}` : '';

        const nameElement = card.querySelector(
          '[data-testid="product-card-title"]'
        );
        const name = nameElement?.textContent?.trim() || '';

        const priceElement = card.querySelector(
          '[data-testid="main-price"] span:last-child'
        );
        const price = priceElement?.textContent?.trim() || '';

        // 获取产品图片URL
        const imageElement = card.querySelector(
          'img[data-testid="product-card-primary-image"]'
        );
        const imageUrl = imageElement?.getAttribute('src') || '';

        if (code && name && price && url) {
          productList.push({ code, name, price, url, imageUrl });
        }
      });

      return productList;
    });

    console.log(`第 ${pageNum} 页找到 ${products.length} 个产品`);
    allProducts.push(...products);

    // 检查是否还有下一页
    // if (pageInfo && pageInfo.current >= 1) {
    if (pageInfo && pageInfo.current >= pageInfo.total) { //<<<<<
      console.log('已到达最后一页');
      break;
    }

    // 构建下一页URL
    pageNum++;
    const nextStart = (pageNum - 1) * itemsPerPage;
    const nextUrl = `https://www.adidas.co.kr/extra_sale-shoes?start=${nextStart}`;

    console.log(`访问下一页: ${nextUrl}`);

    try {
      await page.goto(nextUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    } catch (err) {
      console.log('无法加载下一页:', err.message);
      break;
    }
  }

  // 去重
  const uniqueProducts = Array.from(
    new Map(allProducts.map((p) => [`${p.code}_${p.name}`, p])).values()
  );

  console.log(`\n总共提取 ${uniqueProducts.length} 个不重复的产品:\n`);

  // 打印产品信息
  //   uniqueProducts.forEach((product, index) => {
  //     console.log(`${index + 1}. ${product.name} / ${product.code} / ${product.price} / ${product.url}`);
  //   });

  // 保存到HTML文件
  const today = new Date();
  const dateTimeString = today.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const collectionFolder = 'collection';
  if (!fs.existsSync(collectionFolder)) {
    fs.mkdirSync(collectionFolder);
  }
  const fileName = `${collectionFolder}/adidas-extra-sale-products_${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}_${String(
    today.getHours()
  ).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(
    today.getSeconds()
  ).padStart(2, '0')}.html`;

  const htmlContent = `<!DOCTYPE html>
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
    .row:hover:not(.header) {
      background-color: #f0f0f0;
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
    .cell a:hover {
      text-decoration: underline;
    }
    .product-name {
      cursor: pointer;
      color: #0066cc;
    }
    .product-name:hover {
      text-decoration: underline;
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
  </style>
</head>
<body>
  <div class="container">
    <h1>------ Adidas Extra Sale ------</h1>
    <div class="datetime">抓取时间: ${dateTimeString}</div>
    <div class="table">
      <div class="row header">
        <div class="cell">#</div>
        <div class="cell">Name</div>
        <div class="cell">Code</div>
        <div class="cell">Price</div>
        <div class="cell">URL</div>
      </div>
${uniqueProducts
  .map(
    (p, i) => `      <div class="row">
        <div class="cell">${i + 1}</div>
        <div class="cell"><span class="product-name" onclick="showImage('${
          p.imageUrl
        }')">${p.name}</span></div>
        <div class="cell">${p.code}</div>
        <div class="cell">${p.price}</div>
        <div class="cell"><a href="${p.url}" target="_blank">${p.url}</a></div>
      </div>`
  )
  .join('\n')}
    </div>
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

// 先比较价格（在保存新文件之前）
comparePrice(uniqueProducts, fileName, htmlContent, dateTimeString);

// 关闭标签页（不关闭整个浏览器）
await page.close();
console.log('已关闭抓取标签页');

  return uniqueProducts;
}

// 运行脚本
scrapeNikeProducts()
  .then(() => {
    console.log('\n脚本执行完成!');
    // 等待浏览器打开后再退出
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  })
  .catch((error) => {
    console.error('发生错误:', error);
    process.exit(1);
  });
