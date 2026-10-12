package catalog

import "example.com/shop/internal/shop"

type SKU string

type ShippingMethod string

const (
	NoShipping   ShippingMethod = "none"
	Parcel       ShippingMethod = "parcel"
	Refrigerated ShippingMethod = "refrigerated"
)

type Product interface {
	SKU() SKU
	Name() string
	Price() shop.Money
	ShippingMethod() ShippingMethod
	Packaging() []string
}

type BasicProduct struct {
	sku       SKU
	name      string
	basePrice shop.Money
}

func NewBasicProduct(sku SKU, name string, basePrice shop.Money) BasicProduct {
	return BasicProduct{sku: sku, name: name, basePrice: basePrice}
}

func (p BasicProduct) SKU() SKU {
	return p.sku
}

func (p BasicProduct) Name() string {
	return p.name
}

func (p BasicProduct) Price() shop.Money {
	return p.basePrice
}

func (p BasicProduct) ShippingMethod() ShippingMethod {
	return NoShipping
}

func (p BasicProduct) Packaging() []string {
	return nil
}
