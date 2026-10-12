package catalog

import "example.com/shop/internal/shop"

type PhysicalProduct struct {
	BasicProduct
}

func NewPhysicalProduct(sku SKU, name string, basePrice shop.Money) PhysicalProduct {
	return PhysicalProduct{NewBasicProduct(sku, name, basePrice)}
}

func (p PhysicalProduct) ShippingMethod() ShippingMethod {
	return Parcel
}

func (p PhysicalProduct) Packaging() []string {
	return []string{"cardboard box"}
}
