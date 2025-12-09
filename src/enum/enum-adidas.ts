export enum E_EventOptions {
	Default = 0,
	ApiMode = 1,
	ApiModeScheduled = 2,
	BlackFriday = 3,
}

export const E_EventOptions_GetString = {
	[E_EventOptions.Default]: '默认',
	[E_EventOptions.ApiMode]: 'API 模式',
	[E_EventOptions.ApiModeScheduled]: 'API 模式 (挂机模式)',
	[E_EventOptions.BlackFriday]: 'Black Friday',
};
