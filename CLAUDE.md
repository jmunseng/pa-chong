# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Preference

**IMPORTANT: Always respond in Simplified Chinese (简体中文) for all communications with the user.**

## Project Overview

This is a web scraper (pa-chong means "crawler" in Chinese) that extracts product information from the Adidas Korea extra sale shoes page. The scraper uses Puppeteer to navigate paginated results and outputs product data to a text file.

## Commands

**Run the scraper:**
```bash
node pa-chong.js
```

**Install dependencies:**
```bash
npm install
```

## Architecture

- **Single-file application**: [pa-chong.js](pa-chong.js) contains all scraping logic
- **ES modules**: Uses `"type": "module"` in package.json
- **Dependencies**:
  - `puppeteer`: Headless browser automation for dynamic page scraping
  - `axios`, `cheerio`: Installed but not currently used in the code

## Key Components

**scrapePage(page)**: Extracts product data (name, code, price) from the current page by querying DOM elements with data-testid attributes.

**findNextPage(page)**: Navigates to the next page of results by clicking the next button, returns false when pagination ends.

**retry(fn, retries, delay)**: Wrapper function that retries operations up to 3 times with 5-second delays, used for handling intermittent page load failures.

**main()**: Orchestrates the full scraping process - launches browser, iterates through all pages, deduplicates results, and writes to `adidas_extra_sale_all.txt`.

## Browser Configuration

The Puppeteer instance uses specific args (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-http2`) to improve stability and compatibility. Timeouts are set to 60 seconds to handle slow page loads.

## Output Format

Results are saved to `adidas_extra_sale_all.txt` with format:
```
阿迪達斯 {product_name} / {product_code} / {price}
```

Deduplication is based on the combination of code and name.
