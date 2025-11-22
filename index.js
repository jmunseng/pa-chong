import inquirer from 'inquirer';
import { runAdidasTask } from './src/brand-site/adidas/crawler-adidas.js';
import { E_EventOptions } from './src/enum/enum-adidas.js';
import { runMusinsaAdidasTask } from './src/brand-site/musinsa/crawler-musinsa.js';
import { E_BrandOption } from './src/enum/enum-musinsa.js';

async function handleAdidasSelection() {
	// 第二级菜单：Adidas 子选项
	const adidasChoices = [
		{ name: 'Default (默认)', value: 'default' },
		{ name: 'Black Friday (黑色星期五)', value: 'black-friday' },
		{ name: '返回', value: 'back' },
	];

	const subAnswer = await inquirer.prompt([
		{
			type: 'list',
			name: 'mode',
			message: '请选择 Adidas 模式：',
			choices: adidasChoices,
			default: 'default',
			loop: false,
		},
	]);

	if (subAnswer.mode === 'back') {
		console.log('\n返回主菜单...\n');
		// 重新调用 main 函数返回主菜单
		return main();
	}

	console.log(`\n你选择了 Adidas - ${subAnswer.mode} 模式\n`);

	// 根据不同的模式执行不同的任务
	switch (subAnswer.mode) {
		case 'default':
			console.log('正在执行 Adidas 默认任务...');
			// 在这里调用默认的爬虫逻辑
			runAdidasTask(E_EventOptions.Default);
			break;
		case 'black-friday':
			console.log('正在执行 Adidas 黑色星期五任务...');
			// 在这里调用黑色星期五的爬虫逻辑
			runAdidasTask(E_EventOptions.BlackFriday);
			break;
	}
}

async function handleMusinsaSelection() {
	// 第二级菜单：Musinsa 品牌选项
	const musinsaChoices = [
		{ name: 'Adidas', value: 'adidas' },
		// { name: 'Nike', value: 'nike' },
		{ name: '返回', value: 'back' },
	];

	const subAnswer = await inquirer.prompt([
		{
			type: 'list',
			name: 'brand',
			message: '请选择 Musinsa 品牌：',
			choices: musinsaChoices,
			default: 'adidas',
			loop: false,
		},
	]);

	if (subAnswer.brand === 'back') {
		console.log('\n返回主菜单...\n');
		return main();
	}

	console.log(`\n你选择了 Musinsa - ${subAnswer.brand} 品牌\n`);

	// 根据不同的品牌执行不同的任务
	switch (subAnswer.brand) {
		case 'adidas':
			console.log('正在执行 Musinsa Adidas 任务...');
			runMusinsaAdidasTask(E_BrandOption.Adidas);
			break;
		case 'nike':
			console.log('正在执行 Musinsa Nike 任务...');
			runMusinsaAdidasTask(E_BrandOption.Nike);
			break;
	}
}

async function main() {
	// 第一级菜单：选择网站
	const choices = [
		{ name: 'Adidas', value: 'Adidas' },
		{ name: 'Musinsa', value: 'Musinsa' },
		// { name: 'Nike', value: 'Nike' },
		{ name: '退出', value: 'cancel' },
	];

	const answer = await inquirer.prompt([
		{
			type: 'list',
			name: 'option',
			message: '请选择一个网站：',
			choices: choices,
			default: 'Adidas',
			loop: false,
		},
	]);

	if (!answer.option || answer.option === 'cancel') {
		console.log('\n已退出');
		process.exit(0);
	}

	console.log(`\n你选择了: ${answer.option}\n`);

	// 处理不同的选项
	switch (answer.option) {
		case 'Adidas':
			console.log('正在执行 Adidas 任务...');
			await handleAdidasSelection();
			break;
		case 'Musinsa':
			console.log('正在执行 Musinsa 任务...');
			await handleMusinsaSelection();
			break;
		// case 'Nike':
		// 	console.log('正在执行 Nike 任务...');
		// 	break;
	}
}

main().catch((error) => {
	// 用户按 Ctrl+C 退出
	if (error.isTtyError || error.message.includes('User force closed')) {
		console.log('\n\n已退出');
		process.exit(0);
	}
	console.error('发生错误:', error);
	process.exit(1);
});
