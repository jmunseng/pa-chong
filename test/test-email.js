import { sendEmailToSubscribers } from '../send-email.js';

// 测试发送邮件 - 使用相对路径
const filePath =
	'collection/adidas-extra-sale-products_2025-10-15_19-49-38.html';

console.log('开始测试邮件发送...');
console.log('文件路径 (相对路径):', filePath);
console.log('当前工作目录:', process.cwd());
console.log('---');

sendEmailToSubscribers(filePath)
	.then((result) => {
		console.log('---');
		console.log('测试完成!');
		if (result.success) {
			console.log('✅ 邮件发送成功!');
			console.log('返回数据:', result.data);
		} else {
			console.log('❌ 邮件发送失败!');
			console.log('错误信息:', result.error);
		}
	})
	.catch((error) => {
		console.error('测试过程中出现异常:', error);
	});
