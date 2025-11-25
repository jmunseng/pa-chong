/**
 * Adidas 产品数据类型定义
 */

/**
 * Adidas 产品对象
 */
export interface AdidasProduct {
	/** 产品代码 */
	code: string;
	/** 产品名称 */
	name: string;
	/** 价格 (韩元,数字类型) */
	price: number;
	/** 产品 URL */
	url: string;
	/** 产品图片 URL */
	imageUrl: string;
	/** 是否有额外 30% 折扣 */
	isExtra30Off: boolean;
	/** 是否为新产品 */
	isNewItem?: boolean;
	/** 是否降价 */
	isPriceDropped?: boolean;
	/** 是否涨价 */
	isPriceIncreased?: boolean;
	/** 之前的价格(格式化字符串) */
	previousPrice?: string;
	/** 价格差值(格式化字符串) */
	priceGap?: string;
	/** 是否新增额外 30% 折扣 */
	isNewExtra30Off?: boolean;
}

/**
 * Adidas 产品数据文件结构
 */
export interface AdidasProductData {
	/** 日期时间字符串 */
	dateTimeString: string;
	/** ISO 时间戳 */
	timestamp: string;
	/** 是否有错误 */
	hasError: boolean;
	/** 错误页码 */
	errorPageNum: number;
	/** 产品总数 */
	totalProducts: number;
	/** 产品数据对象,键为产品代码 */
	products: Record<string, AdidasProduct>;
}

/**
 * 已下架产品信息
 */
export interface AdidasRemovedProduct {
	code: string;
	price: number | string;
}

/**
 * 页面分页信息
 */
export interface PageInfo {
	/** 当前页码 */
	current: number;
	/** 总页数 */
	total: number;
}
