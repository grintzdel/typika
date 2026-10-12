package catalog

import "example.com/shop/internal/shop"

type SKU string

// #region tour:compose
type Policies struct {
	Pricing   Pricing
	Shipping  ShippingMethod
	Packaging Packaging
}

type Product struct {
	sku       SKU
	name      string
	basePrice shop.Money
	policies  Policies
}

func NewProduct(sku SKU, name string, basePrice shop.Money, policies Policies) Product {
	return Product{sku: sku, name: name, basePrice: basePrice, policies: policies}
}

// #endregion

func (p Product) SKU() SKU {
	return p.sku
}

func (p Product) Name() string {
	return p.name
}

// #region tour:delegate
func (p Product) Price() shop.Money {
	return p.policies.Pricing(p.basePrice)
}

func (p Product) ShippingMethod() ShippingMethod {
	return p.policies.Shipping
}

func (p Product) Packaging() []string {
	return p.policies.Packaging.Materials
}

// #endregion
