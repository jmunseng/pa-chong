/**
 * Nike 官方 API 响应类型定义
 * API URL: https://api.nike.com/discover/product_wall/v1/marketplace/KR/language/ko/consumerChannelId/...
 */

/**
 * 产品复制内容(标题和副标题)
 */
export interface NikeOfficialApiCopy {
	/** 产品标题 */
	title: string;
	/** 产品副标题 */
	subTitle: string;
}

/**
 * 简单颜色信息
 */
export interface NikeOfficialApiSimpleColor {
	/** 颜色标签 */
	label: string;
	/** 颜色十六进制代码 */
	hex: string;
}

/**
 * 显示颜色信息
 */
export interface NikeOfficialApiDisplayColors {
	/** 简单颜色 */
	simpleColor: NikeOfficialApiSimpleColor;
	/** 颜色描述 */
	colorDescription: string;
}

/**
 * 价格信息
 */
export interface NikeOfficialApiPrices {
	/** 货币单位 */
	currency: string;
	/** 当前价格 (韩元) */
	currentPrice: number;
	/** 员工价格 (韩元) */
	employeePrice: number;
	/** 原价 (韩元) */
	initialPrice: number;
	/** 折扣百分比 */
	discountPercentage: number;
	/** 员工折扣百分比 */
	employeeDiscountPercentage: number;
}

/**
 * 产品图片 URL
 */
export interface NikeOfficialApiColorwayImages {
	/** 竖版图片 URL */
	portraitURL: string;
	/** 方形图片 URL */
	squarishURL: string;
}

/**
 * 产品详情页 URL
 */
export interface NikeOfficialApiPdpUrl {
	/** 完整 URL */
	url: string;
	/** URL 路径 */
	path: string;
}

/**
 * Nike 官方 API 产品对象
 */
export interface NikeOfficialApiProduct {
	/** 产品组键 */
	groupKey: string;
	/** 产品代码 */
	productCode: string;
	/** 产品类型 (如 "FOOTWEAR") */
	productType: string;
	/** 产品子类型 (如 "STANDARD") */
	productSubType: string;
	/** 全局产品 ID */
	globalProductId: string;
	/** 内部产品 ID */
	internalPid: string;
	/** 商品产品 ID */
	merchProductId: string;
	/** 消费者渠道 ID */
	consumerChannelId: string;
	/** 产品复制内容 */
	copy: NikeOfficialApiCopy;
	/** 显示颜色 */
	displayColors: NikeOfficialApiDisplayColors;
	/** 价格信息 */
	prices: NikeOfficialApiPrices;
	/** 产品图片 */
	colorwayImages: NikeOfficialApiColorwayImages;
	/** 特色属性 (可能为 null) */
	featuredAttributes: string[] | null;
	/** 产品详情页 URL */
	pdpUrl: NikeOfficialApiPdpUrl;
	/** 新品截止日期 (可能为 null) */
	isNewUntil: string | null;
	/** 促销信息 (可能为 null) */
	promotions: unknown | null;
	/** 定制信息 (可能为 null) */
	customization: unknown | null;
	/** 徽章属性 (可能为 null) */
	badgeAttribute: string | null;
	/** 徽章标签 (可能为 null) */
	badgeLabel: string | null;
}

/**
 * 产品组
 */
export interface NikeOfficialApiProductGrouping {
	/** 卡片类型 */
	cardType: string;
	/** 属性 (可能为 null) */
	properties: unknown | null;
	/** 产品列表 */
	products: NikeOfficialApiProduct[];
}

/**
 * 分页信息
 */
export interface NikeOfficialApiPages {
	/** 下一页 URL */
	next: string;
	/** 上一页 URL */
	prev: string;
	/** 总页数 */
	totalPages: number;
	/** 总资源数 */
	totalResources: number;
}

/**
 * Nike 官方 API 响应结构
 */
export interface NikeOfficialApiResponse {
	/** 搜索词 (可能为 null) */
	searchTerm: string | null;
	/** 规范 URL (可能为 null) */
	canonicalUrl: string | null;
	/** 标题 (可能为 null) */
	title: string | null;
	/** 主标题 (可能为 null) */
	primaryHeading: string | null;
	/** 属性 ID 列表 */
	attributeIds: string[];
	/** 消费者渠道 ID */
	consumerChannelId: string;
	/** 市场 (如 "KR") */
	marketplace: string;
	/** 位置 ID (可能为 null) */
	locationId: string | null;
	/** 语言 (如 "ko") */
	language: string;
	/** 选中的过滤器数量 (可能为 null) */
	selectedFiltersCount: number | null;
	/** ML 模型 */
	mlModels: string[];
	/** 分析器 (可能为 null) */
	analyzer: string | null;
	/** 内容数据 (可能为 null) */
	contentData: unknown | null;
	/** 导航 (可能为 null) */
	navigation: unknown | null;
	/** 产品组列表 */
	productGroupings: NikeOfficialApiProductGrouping[];
	/** 分页信息 */
	pages: NikeOfficialApiPages;
}
