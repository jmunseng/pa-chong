/**
 * Nike 产品数据类型定义
 */

/**
 * Nike 官方产品对象
 */
export interface NikeProduct {
	/** 产品代码 (如 "BV1021-108") */
	code: string;
	/** 产品名称 */
	name: string;
	/** 价格 (韩元,数字类型) */
	price: number;
	/** 产品 URL */
	url: string;
	/** 产品图片 URL */
	imageUrl: string;
	/** 原价 (韩元) */
	originalPrice?: number;
	/** 折扣百分比 */
	discountPercentage?: number;
	/** 副标题/类别 */
	subTitle?: string;
	/** 颜色描述 */
	colorDescription?: string;
	/** 是否为新产品 */
	isNewItem?: boolean;
	/** 是否降价 */
	isPriceDropped?: boolean;
	/** 是否涨价 */
	isPriceIncreased?: boolean;
	/** 之前的价格 (数字类型) */
	previousPrice?: number;
	/** 价格差距 (韩元) */
	priceGap?: number;
	/** 是否为新降价产品 (本次新降价) */
	isNewPriceDropped?: boolean;
}

/**
 * Nike 产品集合数据
 */
export interface NikeProductCollection {
	/** 抓取时间字符串 */
	dateTimeString: string;
	/** 时间戳 (ISO 格式) */
	timestamp: string;
	/** 是否有错误 */
	hasError: boolean;
	/** 总产品数 */
	totalProducts: number;
	/** 产品对象 (以产品代码为键) */
	products: Record<string, NikeProduct>;
}

/**
 * Nike 产品数据 (别名,用于向后兼容)
 */
export type NikeProductData = NikeProductCollection;

/**
 * 已下架产品信息
 */
export interface RemovedProduct {
	/** 产品代码 */
	code: string;
	/** 商品名称 */
	goodsName: string;
	/** 价格 */
	price: number;
	/** 商品链接 URL */
	goodsLinkUrl: string;
	/** 缩略图 URL */
	thumbnail: string;
}
