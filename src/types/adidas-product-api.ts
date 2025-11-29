/**
 * Adidas API 响应类型定义
 */

/**
 * 价格信息
 */
export interface AdidasApiPrice {
	/** 价格类型: original (原价) 或 sale (特价) */
	type: 'original' | 'sale';
	/** 不含增值税的价格 */
	valueNoVat: number;
	/** 含增值税的价格 */
	value: number;
	/** 折扣百分比 (仅在 original 类型中存在) */
	discountPercentage?: number;
}

/**
 * 产品价格数据
 */
export interface AdidasApiPriceData {
	/** 价格列表 (通常包含原价和特价) */
	prices: AdidasApiPrice[];
}

/**
 * 颜色变体 (根据实际 API 数据结构定义,当前为空数组)
 */
export type AdidasApiColourVariation = Record<string, unknown>;

/**
 * API 返回的产品对象
 */
export interface AdidasApiProduct {
	/** 产品 ID/代码 (例: "JQ2847") */
	id: string;
	/** 产品标题/名称 */
	title: string;
	/** 副标题/类别 */
	subTitle: string;
	/** 产品 URL 路径 */
	url: string;
	/** 主图片 URL */
	image: string;
	/** 价格数据 */
	priceData: AdidasApiPriceData;
	/** 是否额外 30% 折扣 */
	isExtra30Off?: boolean;
	/** Adidas API Extra 30 URL */
	apiExtra30Url: string;
	/** 颜色变体列表 */
	colourVariations: AdidasApiColourVariation[];
	/** 悬停图片 URL */
	hoverImage: string;
	/** 是否为男女通用 */
	unisex: boolean;
}

/**
 * 排序规则
 */
export interface AdidasApiRanking {
	/** 排序方向: asc (升序) 或 desc (降序) */
	direction: 'asc' | 'desc';
	/** 排序属性字段 */
	attribute: string;
}

/**
 * 分页和排序信息
 */
export interface AdidasApiInfo {
	/** 每页显示数量 */
	viewSize: number;
	/** 视图集大小 */
	viewSetSize: string;
	/** 总商品数量 */
	count: number;
	/** 起始索引 */
	startIndex: number;
	/** 当前页码 */
	currentSet: number;
	/** 集合 (通常为空数组) */
	collection: unknown[];
	/** 排序规则列表 */
	ranking: AdidasApiRanking[];
}

/**
 * 页面属性
 */
export interface AdidasApiPageProps {
	/** 受众类型 */
	audience: string;
	/** 完整 URL */
	fullUrl: string;
	/** CMS 数据 (可能为 null) */
	cms: unknown | null;
	/** 是否为爬虫 */
	isCrawler: boolean;
	/** 页面分类 */
	pageCategory: string | null;
	/** 页面类型 */
	pageType: string;
	/** 路径名 */
	pathname: string;
	/** 活跃的 SEO 测试 ID 列表 */
	activeSeoTestIds: unknown[];
	/** 分类标识 */
	taxonomy: string;
	/** 分页和排序信息 */
	info: AdidasApiInfo;
	/** 页面标题 */
	title: string;
	/** 产品列表 */
	products: AdidasApiProduct[];
}

/**
 * Adidas API 完整响应结构
 */
export interface AdidasApiResponse {
	/** 页面属性数据 */
	pageProps: AdidasApiPageProps;
	/** Next.js 构建 ID (可选) */
	__N_SSP?: boolean;
}

/**
 * Extra 30 API 产品徽章
 */
export interface AdidasApiExtra30Badge {
	/** 徽章样式 */
	style: string;
	/** 徽章文本 (例: "최대 30% 추가 할인✨") */
	text: string;
}

/**
 * Extra 30 API 产品信息
 */
export interface AdidasApiExtra30Product {
	/** 产品 ID */
	id: string;
	/** 产品标题 */
	title: string;
	/** 产品 URL */
	url: string;
	/** 产品图片 URL */
	image: string;
	/** 悬停图片 URL */
	hoverImage: string;
	/** 价格数据 */
	priceData: {
		/** 价格列表 */
		prices: AdidasApiPrice[];
		/** 是否售罄 */
		isSoldOut: boolean;
	};
	/** 产品徽章 (可能为 null) */
	badge: AdidasApiExtra30Badge | null;
	/** 型号编号 */
	modelNumber: string;
}

/**
 * Extra 30 API 响应结构
 */
export interface AdidasApiExtra30Response {
	/** 产品信息 */
	product: AdidasApiExtra30Product;
	/** 原始 URL */
	originUrl: string;
}
