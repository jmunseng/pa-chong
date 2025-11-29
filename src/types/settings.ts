/**
 * 配置文件类型定义
 */

/**
 * Adidas 配置
 */
export interface AdidasSettings {
	/** Adidas 官网 URL */
	url: string;
	/** Adidas API URL */
	apiUrl: string;
	apiExtra30ItemUrl: string;
	/** Adidas API Extra 30% URL */
	apiExtra30Url: string;
	/** 黑色星期五 URL */
	blackFridayUrl: string;
	/** 每页商品数 */
	itemPerPage: number;
}

/**
 * Nike 配置
 */
export interface NikeSettings {
	/** Nike 官网 URL */
	url: string;
	/** 每页商品数 */
	itemPerPage: number;
}

/**
 * Musinsa 单个品牌配置
 */
export interface MusinsaBrandSettings {
	/** API URL 模板,{PAGE} 将被替换为页码 */
	url: string;
	/** 每页商品数 */
	itemPerPage: number;
}

/**
 * Musinsa 配置
 */
export interface MusinsaSettings {
	/** Adidas 品牌配置 */
	adidas: MusinsaBrandSettings;
	/** Nike 品牌配置 */
	nike: MusinsaBrandSettings;
}

/**
 * 爬虫配置参数
 */
export interface CrawlerConfig {
	/** 点击延迟(毫秒) */
	CLICK_DELAY: number;
	/** 遮罩层关闭超时(毫秒) */
	OVERLAY_DISMISS_TIMEOUT: number;
	/** 选择器超时(毫秒) */
	SELECTOR_TIMEOUT: number;
	/** 滚动检查超时(毫秒) */
	SCROLL_CHECK_TIMEOUT: number;
	/** 滚动距离(像素) */
	SCROLL_DISTANCE: number;
	/** 滚动间隔(毫秒) */
	SCROLL_INTERVAL: number;
	/** 徽章加载等待时间(毫秒) */
	BADGE_LOAD_WAIT: number;
	/** 页面加载超时(毫秒) */
	PAGE_LOAD_TIMEOUT: number;
}

/**
 * 完整的配置文件结构
 */
export interface Settings {
	/** Adidas 配置 */
	adidas: AdidasSettings;
	/** Musinsa 配置 */
	musinsa: MusinsaSettings;
	/** Nike 配置 */
	nike: NikeSettings;
	/** 爬虫配置参数 */
	CONFIG: CrawlerConfig;
	/** 是否为调试模式 */
	isDebugMode: boolean;
}
