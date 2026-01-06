/**
 * Lululemon 产品数据类型定义
 */

/**
 * Lululemon 产品对象
 */
export interface LululemonProduct {
	/** 产品代码 (从图片 URL 中提取,如 "LM3FG2S") */
	code: string;
	/** 产品名称 (如 "메탈 벤트 테크 숏슬리브 셔츠") */
	name: string;
	/** 当前售价 (韩元,数字类型) */
	price: number;
	/** 产品详情页 URL */
	url: string;
	/** 产品图片 URL (高清图 800x800) */
	imageUrl: string;
	/** 原价/划线价 (韩元) */
	originalPrice?: number;
	/** 产品 ID (如 "prod11710026" 或 "LW5GO9A") */
	productId?: string;
	/** 颜色代码 (如 "060163") */
	colorCode?: string;
	/** 颜色名称 (如 "Night Sea/Soft Denim") */
	colorName?: string;
	/** 是否为新产品 */
	isNewItem?: boolean;
	/** 是否降价 */
	isPriceDropped?: boolean;
	/** 是否涨价 */
	isPriceIncreased?: boolean;
	/** 之前的价格 (韩元) */
	previousPrice?: number;
	/** 价格差距 (韩元) */
	priceGap?: number;
}

/**
 * Lululemon 产品集合数据
 */
export interface LululemonProductCollection {
	/** 抓取时间字符串 */
	dateTimeString: string;
	/** 时间戳 (ISO 格式) */
	timestamp: string;
	/** 是否有错误 */
	hasError: boolean;
	/** 错误发生的页码 */
	errorPageNum?: number;
	/** 总产品数 */
	totalProducts: number;
	/** 产品对象 (以产品代码为键) */
	products: Record<string, LululemonProduct>;
}

/**
 * Lululemon 产品数据 (别名,用于向后兼容)
 */
export type LululemonProductData = LululemonProductCollection;

/**
 * 已下架产品信息
 */
export interface LululemonRemovedProduct {
	/** 产品代码 */
	code: string;
	/** 价格 */
	price: number;
	/** 产品名称 */
	name: string;
}
