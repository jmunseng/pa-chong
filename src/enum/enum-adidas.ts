export enum E_EventOptions {
	Default = 0,
	ApiModeOutlet = 1,
	ApiModeOutletScheduled = 2,
	BlackFriday = 3,
	ApiModeAllHomeProducts = 4,
}

export const E_EventOptions_GetString = {
	[E_EventOptions.Default]: '默认',
	[E_EventOptions.ApiModeOutlet]: 'API 模式 (Outlet 商品)',
	[E_EventOptions.ApiModeOutletScheduled]: 'API 模式 (挂机模式 Outlet 商品)',
	[E_EventOptions.BlackFriday]: 'Black Friday',
	[E_EventOptions.ApiModeAllHomeProducts]: 'API 模式 (所有商品)',
};
