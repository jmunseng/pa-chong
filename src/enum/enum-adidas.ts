export enum E_EventOptions {
	Default = 0,
	ApiMode = 1,
	BlackFriday = 2,
}

export const E_EventOptions_GetString = {
	[E_EventOptions.Default]: '默认',
	[E_EventOptions.ApiMode]: 'API 模式',
	[E_EventOptions.BlackFriday]: 'Black Friday',
};
