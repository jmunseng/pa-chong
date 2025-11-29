/**
 * Musinsa 产品数据类型定义
 */

/**
 * Musinsa API 返回的产品对象
 */
export interface MusinsaApiProduct {
	/** 商品编号 */
	goodsNo: number;
	/** 商品名称 */
	goodsName: string;
	/** 商品链接 */
	goodsLinkUrl: string;
	/** 商品缩略图 */
	thumbnail: string;
	/** 性别分类 */
	displayGenderText: string;
	/** 是否售罄 */
	isSoldOut: boolean;
	/** 原价 */
	normalPrice: number;
	/** 售价 (韩元,数字类型) */
	price: number;
	/** 优惠券价格 */
	couponPrice: number | null;
	/** 折扣率 */
	saleRate: number;
	/** 优惠券折扣率 */
	couponSaleRate: number | null;
	/** 是否有选项价格 */
	hasOptionPrice: boolean;
	/** 品牌 ID */
	brand: string;
	/** 品牌名称 */
	brandName: string;
	/** 品牌链接 */
	brandLinkUrl: string;
	/** 评论数量 */
	reviewCount: number;
	/** 评论分数 */
	reviewScore: number;
	/** 是否显示选项 */
	isOptionVisible: boolean;
	/** 是否为广告 */
	isAd: boolean;
	/** 广告提示 */
	adTooltip: string | null;
	/** Plus 配送指南文本 */
	plusDeliveryGuideText: string;
	/** 信息标签列表 */
	infoLabelList: any[];
	/** 图片标签列表 */
	imageLabelList: any[];
	/** 点击追踪器 */
	clickTrackers: any[];
	/** 展示追踪器 */
	impressionTrackers: any[];
	/** Snap 数据 */
	snap: any | null;
	/** 分数 */
	score: number;
	/** 是否为 Plus 配送 */
	isPlusDelivery: boolean;
	/** 二手商品等级 */
	usedConditionGrade: string | null;
}

/**
 * Musinsa 产品对象 (扩展了 API 产品数据)
 */
export interface MusinsaProduct extends MusinsaApiProduct {
	/** 产品代码 (从 goodsName 提取或使用 goodsNo) */
	code: string;
	/** 是否为新产品 */
	isNewItem?: boolean;
	/** 是否降价 */
	isPriceDropped?: boolean;
	/** 是否涨价 */
	isPriceIncreased?: boolean;
	/** 之前的价格 */
	previousPrice?: number;
	/** 价格差值 */
	priceGap?: number;
}

/**
 * Musinsa 产品数据文件结构
 */
export interface MusinsaProductData {
	/** 日期时间字符串 */
	dateTimeString: string;
	/** ISO 时间戳 */
	timestamp: string;
	/** 是否有错误 */
	hasError: boolean;
	/** 错误页码 (可选,用于串行抓取时记录错误) */
	errorPageNum?: number;
	/** 产品总数 */
	totalProducts: number;
	/** 产品数据对象,键为产品代码 */
	products: Record<string, MusinsaProduct>;
}

/**
 * 已下架产品信息
 */
export interface RemovedProduct {
	code: string;
	goodsName: string;
	price: number;
	goodsLinkUrl: string;
	thumbnail: string;
}

/**
 * Musinsa API 响应的分页信息
 */
export interface MusinsaPagination {
	/** 总页数 */
	totalPages: number;
	/** 总商品数 */
	totalCount: number;
}

/**
 * Musinsa API 响应数据
 */
export interface MusinsaApiResponseData {
	/** 商品列表 */
	list: MusinsaApiProduct[];
	/** 分页信息 */
	pagination: MusinsaPagination;
}

/**
 * Musinsa API 响应元信息
 */
export interface MusinsaApiMeta {
	/** 请求结果状态 */
	result: 'SUCCESS' | 'FAIL';
}

/**
 * Musinsa API 完整响应
 */
export interface MusinsaApiResponse {
	/** 响应数据 */
	data: MusinsaApiResponseData;
	/** 响应元信息 */
	meta: MusinsaApiMeta;
}

/**
 * 配置文件中的 Musinsa 品牌设置
 */
export interface MusinsaBrandSettings {
	/** API URL 模板,{PAGE} 将被替换为页码 */
	url: string;
	/** 每页商品数 */
	itemPerPage: number;
}

/**
 * 配置文件中的 Musinsa 设置
 */
export interface MusinsaConfigSettings {
	/** Adidas 品牌配置 */
	adidas: MusinsaBrandSettings;
	/** Nike 品牌配置 */
	nike: MusinsaBrandSettings;
}

/**
 * @deprecated 请使用 ../types/settings.js 中的 Settings 类型
 * 为了向后兼容保留此类型定义
 */
export interface Settings {
	/** 是否为调试模式 */
	isDebugMode: boolean;
	/** Musinsa 配置 */
	musinsa: MusinsaConfigSettings;
}
