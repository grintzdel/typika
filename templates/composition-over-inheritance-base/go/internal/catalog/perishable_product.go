package catalog

import "example.com/shop/internal/shop"

type PerishableProduct struct {
	PhysicalProduct
}

func NewPerishableProduct(sku SKU, name string, basePrice shop.Money) PerishableProduct {
	return PerishableProduct{NewPhysicalProduct(sku, name, basePrice)}
}

func (p PerishableProduct) ShippingMethod() ShippingMethod {
	return Refrigerated
}

func (p PerishableProduct) Packaging() []string {
	return []string{"insulated box"}
}
