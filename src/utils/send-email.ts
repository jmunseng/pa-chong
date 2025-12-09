import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

interface EmailAttachment {
	filename: string;
	content: string;
}

interface EmailResult {
	success: boolean;
	data?: any;
	error?: any;
}

export async function sendNewAndPriceChangedItemsByEmail(emailContent: string): Promise<EmailResult> {
	try {
		// 检查 API Key 是否配置
		if (!process.env.RESEND_API_KEY) {
			const error = 'RESEND_API_KEY 未配置,请检查 .env 文件';
			console.error('❌', error);
			return { success: false, error };
		}

		const resend = new Resend(process.env.RESEND_API_KEY);
		console.log(`准备发送邮件 [新品与降价商品]`);

		// 发送邮件
		const result = await resend.emails.send({
			from: 'pa-chong system <onboarding@resend.dev>',
			to: ['abbrcn@gmail.com'],
			subject: `Adidas Outlet - 新品与降价商品通知 - ${new Date().toLocaleString('zh-CN')}`,
			html: emailContent,
		});

		// Resend API 返回格式: { data: {...}, error: null } 或 { data: null, error: {...} }
		if (result.error) {
			console.error('❌ 发送邮件失败:', result.error);
			return { success: false, error: result.error };
		}

		console.log('✅ 邮件发送成功 [新品与降价商品]:', result.data);
		return { success: true, data: result.data };
	} catch (err) {
		console.error('❌ 发送邮件时出错:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return { success: false, error: errorMessage };
	}
}

/**
 * 发送邮件给订阅者
 * @param filePath - HTML 文件路径
 * @returns 邮件发送结果
 */
export async function sendEmailToSubscribers(filePath: string): Promise<EmailResult> {
	const resend = new Resend(process.env.RESEND_API_KEY);

	try {
		// 读取 HTML 文件内容
		const htmlContent: string = fs.readFileSync(filePath, 'utf-8');

		// 从文件路径中提取文件名
		const fileName: string = path.basename(filePath);

		// 从文件名中提取日期和时间信息(如果存在)
		const dateTimeMatch: RegExpMatchArray | null = fileName.match(/(\d{4}-\d{2}-\d{2})[-_]?(\d{2}[-:]?\d{2}[-:]?\d{2})?/);
		const dateStr: string = dateTimeMatch
			? dateTimeMatch[1] + (dateTimeMatch[2] ? ' ' + dateTimeMatch[2].replace(/[-_]/g, ':') : '')
			: new Date().toLocaleString('zh-CN', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
				});

		// 将 HTML 内容转换为 Base64 编码
		const base64HtmlContent: string = Buffer.from(htmlContent, 'utf-8').toString('base64');

		console.log(`准备发送邮件,HTML 文件大小: ${htmlContent.length} 字节`);

		// 准备附件数组
		const attachments: EmailAttachment[] = [
			{
				filename: fileName,
				content: base64HtmlContent,
			},
		];

		// // 检查同名的 .xlsx 文件是否存在
		const xlsxFilePath: string = filePath.replace('.html', '.xlsx');
		const xlsxFileName: string = fileName.replace('.html', '.xlsx');

		if (fs.existsSync(xlsxFilePath)) {
			// 读取 Excel 文件并转换为 Base64
			const xlsxContent: Buffer = fs.readFileSync(xlsxFilePath);
			const base64XlsxContent: string = xlsxContent.toString('base64');

			attachments.push({
				filename: xlsxFileName,
				content: base64XlsxContent,
			});

			console.log(`找到 Excel 文件: ${xlsxFileName}, 大小: ${xlsxContent.length} 字节`);
		} else {
			console.log(`未找到 Excel 文件: ${xlsxFilePath}`);
		}

		// 发送邮件
		const { data, error } = await resend.emails.send({
			from: 'pa-chong system <onboarding@resend.dev>',
			to: ['abbrcn@gmail.com'],
			subject: `Adidas Outlet 特卖商品 - ${dateStr}`,
			html: '<p>请查看附件中的 Adidas Outlet 特卖商品清单。</p>',
			attachments: attachments,
		});

		if (error) {
			console.error('发送邮件失败:', error);
			return { success: false, error };
		}

		console.log('邮件发送成功:', data);
		return { success: true, data };
	} catch (err) {
		console.error('读取文件或发送邮件时出错:', err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return { success: false, error: errorMessage };
	}
}
