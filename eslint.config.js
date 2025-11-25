import css from '@eslint/css';
import js from '@eslint/js';
import json from '@eslint/json';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
	{
		ignores: ['**/*.md', '**/.claude/**', '**/node_modules/**', '**/dist/**'],
	},
	{
		files: ['**/*.{js,mjs,cjs}'],
		plugins: {
			perfectionist,
			js,
		},
		extends: ['js/recommended'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			'perfectionist/sort-imports': 'error',
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			'@typescript-eslint': tseslint,
			perfectionist,
		},
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module',
			},
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			'perfectionist/sort-imports': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	{
		files: ['**/*.json'],
		ignores: ['**/package-lock.json', '**/node_modules/**'],
		plugins: { json },
		language: 'json/json',
		extends: ['json/recommended'],
	},
	{
		files: ['**/*.jsonc'],
		plugins: { json },
		language: 'json/jsonc',
		extends: ['json/recommended'],
	},
	{
		files: ['**/*.json5'],
		plugins: { json },
		language: 'json/json5',
		extends: ['json/recommended'],
	},
	{
		files: ['**/*.css'],
		plugins: { css },
		language: 'css/css',
		extends: ['css/recommended'],
	},
]);
