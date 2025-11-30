export enum E_BrandSite {
	Adidas = 'adidas',
	Musinsa = 'musinsa',
	Nike = 'nike',
}

export const E_BrandSite_GetString: Record<E_BrandSite, string> = {
	[E_BrandSite.Adidas]: 'Adidas',
	[E_BrandSite.Musinsa]: 'Musinsa',
	[E_BrandSite.Nike]: 'Nike',
};
