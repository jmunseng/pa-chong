# Repository Guidelines

## Project Structure and Module Organization

`pa-chong-real.js` is the primary entry point orchestrating the adidas outlet scraping flow. `compare-price.js` performs historical price comparisons, `create-excel.js` produces Excel reports, and `send-email.js` delivers results through Resend. The `collection/` directory stores HTML and XLSX archives named with timestamps (for example `adidas-extra-sale-products_2025-10-24_09-30-00.html`); always append new files rather than overwriting existing ones. Monitor `chrome-data/` and `chrome-profile/` when debugging browser state, and clear them before rerunning if required.

## Build, Test, and Development Commands

- `npm install`: synchronize the dependencies defined in `package.json`.
- `npm run dev`: load `.env` and run the real browser scraper, which is ideal for debugging the workflow.
- `./start.sh`: install dependencies and start the scraper in a fresh environment.
- `node test-excel.js`: regenerate `test-excel-output.xlsx` with sample data for manual verification.
- `node --env-file=.env test-email.js`: send a test email with the latest results to confirm the Resend configuration.

## Coding Style and Naming Conventions

The project uses ESM modules with tab indentation. Keep trailing commas in multi-line literals. Script files follow kebab-case naming (for example `compare-price.js`), and scraped artifacts use `YYYY-MM-DD_HH-MM-SS` timestamps. Run `npx eslint .` before committing; update `eslint.config.js` if you need additional rules.

## Interaction Requirements

All Codex assistant replies must be delivered in Simplified Chinese; responses in any other language are not allowed.

## Testing and Verification Guidelines

Use `node create-test.js` to generate diverse HTML scenarios. Run the scraper at least twice and execute the comparison script to record newly added or removed products. When checking Excel output, verify image rendering and error indicators. Complete email pipeline testing with a sandbox mailbox before switching to production credentials.

## Pull Request Requirements

Write commit messages as concise imperatives (for example `add test case`). If a commit covers multiple steps, list them in the body. Every PR must link the related issue, summarize the affected scripts and any new files under `collection/`, and attach key screenshots or cite attachment names. Document `.env` variables or Chrome configuration steps so reviewers can reproduce the setup.

## Security and Configuration Notes

Store sensitive credentials only in `.env` (which is not versioned). Ensure required keys such as `RESEND_API_KEY` are set before running. If authentication behaves unexpectedly, clear `chrome-data/` and `chrome-profile/` before retrying, and re-authenticate afterward.
