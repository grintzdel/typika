package catalog

import "example.com/shop/internal/shop"

type DiscountedPerishableProduct struct {
	PerishableProduct
	discountPercent int
}

func NewDiscountedPerishableProduct(
	sku SKU, name string, basePrice shop.Money, discountPercent int,
) DiscountedPerishableProduct {
	return DiscountedPerishableProduct{NewPerishableProduct(sku, name, basePrice), discountPercent}
}

func (p DiscountedPerishableProduct) Price() shop.Money {
	return p.PerishableProduct.Price().PercentOff(p.discountPercent)
}
