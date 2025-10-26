# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Preference

**IMPORTANT: Always respond in Simplified Chinese (简体中文) for all communications with the user.**

## Project Overview

这是一个 Adidas 韩国官网 Outlet 特卖商品的爬虫系统。系统使用 Puppeteer 抓取产品信息,比较价格变化,生成 HTML 报告,并通过邮件发送给订阅者。

## 环境配置

**环境变量文件**: `.env` (需要包含 `RESEND_API_KEY`)

## Commands

**运行爬虫 (主程序):**

```bash
npm run dev
```

或

```bash
node --env-file=.env pa-chong-real.js
```

**测试邮件发送:**

```bash
npm run test-email
```

**安装依赖:**

```bash
npm install
```

## Architecture

### 核心文件

- **pa-chong-real.js**: 主爬虫程序,使用 puppeteer-real-browser 进行反检测抓取
- **utils/adidas.js**: 核心工具函数集,包括价格比较、HTML 生成、文件查找等
- **send-email.js**: 使用 Resend API 发送邮件通知
- **test-email.js**: 邮件发送功能的测试脚本

### 数据流程

1. **抓取阶段** (pa-chong-real.js): 使用真实浏览器访问 Adidas 韩国官网,抓取所有 Outlet 产品信息
2. **数据存储**: 将产品数据保存为 JSON 文件到 `collection/` 目录,格式为 `adidas-extra-sale-products_YYYY-MM-DD_HH-MM-SS.json`
3. **价格比较** (utils/adidas.js:comparePrice): 查找上一次抓取的 JSON 文件,比较价格变化
4. **HTML 生成** (utils/adidas.js:generateHTMLWithPriceComparison): 生成带有价格比较、筛选功能的 HTML 报告
5. **邮件发送** (send-email.js): 将 HTML 报告作为附件发送到订阅邮箱

## 关键功能

### 反检测机制

- 使用 `puppeteer-real-browser` 而非标准 Puppeteer
- 自动处理 Cloudflare Turnstile 验证
- 先访问主页建立会话,再访问目标页面
- 模拟人类行为(滚动、等待)

### 产品信息提取

每个产品包含:
- `code`: 产品代码 (从 URL 中提取)
- `name`: 产品名称
- `price`: 韩元价格
- `url`: 产品详情页 URL
- `imageUrl`: 产品图片 URL
- `isExtra30Off`: 是否有额外 30% 折扣标记

### 价格比较功能

系统会自动标记:
- **新产品**: 上次抓取时不存在的产品
- **降价产品**: 价格低于上次抓取的产品
- **涨价产品**: 价格高于上次抓取的产品
- **已下架产品**: 本次抓取中不存在但上次存在的产品
- **新增 Extra 30% OFF**: 上次没有但本次有额外折扣的产品

### HTML 报告功能

生成的 HTML 包含:
- 价格比较视觉指示(背景颜色标记)
- 三个筛选按钮: 新品、降价品、New 30% OFF
- 汇率计算器(韩元 → 人民币)
- 点击产品代码可复制
- 点击产品图片可放大查看
- 粘性表头(sticky header)

## Dependencies

### 核心依赖
- `puppeteer-real-browser`: 反检测浏览器自动化
- `puppeteer-extra` + `puppeteer-extra-plugin-stealth`: 增强反检测能力
- `resend`: 邮件发送服务
- `exceljs`: Excel 文件生成(当前注释掉)
- `sqlite3`: 数据库(预留功能)

### 未使用的依赖
- `axios`, `cheerio`: 已安装但当前代码未使用(可能用于备选方案)

## 数据存储

### 文件命名规范

- JSON 数据文件: `collection/adidas-extra-sale-products_YYYY-MM-DD_HH-MM-SS.json`
- HTML 报告文件: `collection/adidas-extra-sale-products_YYYY-MM-DD_HH-MM-SS.html`
- Excel 文件(可选): `collection/adidas-extra-sale-products_YYYY-MM-DD_HH-MM-SS.xlsx`

### JSON 数据结构

```json
{
  "dateTimeString": "2025. 10. 25. 오전 12:00:00",
  "timestamp": "2025-10-25T00:00:00.000Z",
  "totalProducts": 150,
  "products": {
    "PRODUCT_CODE": {
      "code": "PRODUCT_CODE",
      "name": "产品名称",
      "price": "99,000 원",
      "url": "https://www.adidas.co.kr/...",
      "imageUrl": "https://...",
      "isExtra30Off": true,
      "isPriceDropped": false,
      "isPriceIncreased": false,
      "isNewItem": false,
      "isNewExtra30Off": false
    }
  }
}
```

## 关键算法

### findPreviousJSONFile (utils/adidas.js:65)

从 `collection/` 目录中查找上一次抓取的 JSON 文件:
1. 过滤出符合命名规范的文件
2. 排除当前正在生成的文件
3. 从文件名提取时间戳
4. 按时间降序排列,返回最新的

### comparePrice (utils/adidas.js:775)

比较当前抓取数据与上一次抓取的数据:
1. 读取当前和上一次的 JSON 文件
2. 逐个产品比对价格
3. 标记价格变化类型(降价/涨价/新品)
4. 识别已下架产品
5. 生成 HTML 报告
6. 发送邮件通知

## Browser Configuration

Puppeteer-real-browser 配置:
- `headless: false`: 使用有头浏览器(更真实)
- `turnstile: true`: 自动处理 Cloudflare 验证
- 窗口最大化启动
- 沙盒禁用(提高兼容性)
- 默认视口设为 null(使用完整浏览器窗口)

## Email Configuration

使用 Resend API 发送邮件:
- 发件人: `pa-chong system <onboarding@resend.dev>`
- 收件人: 在 send-email.js:72 中配置
- 附件: HTML 报告 + Excel 文件(如果存在)

## 分页抓取逻辑

1. 每页显示 48 个产品
2. 通过修改 URL 参数 `start` 进行翻页: `?grid=true&start=48`
3. 从页面指示器 `[data-testid="page-indicator"]` 读取总页数
4. 当前代码在第 1 页后停止 (pa-chong-real.js:217),可能用于测试

## Development Notes

- ES modules 模式 (`"type": "module"` in package.json)
- 使用 `--env-file=.env` 加载环境变量
- 所有产品使用产品代码作为唯一标识符
- 产品数据使用对象存储(以 code 为键)实现自动去重