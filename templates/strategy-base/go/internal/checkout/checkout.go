package checkout

import (
	"fmt"
	"slices"

	"example.com/shop/internal/shop"
)

func QuoteShipping(order shop.Order, option ShippingOption) (Quote, error) {
	if !slices.Contains(ShippingOptions, option) {
		return Quote{}, fmt.Errorf("unknown shipping option %q", option)
	}
	subtotal := order.Subtotal()
	shipping := shippingCost(order, subtotal, option)
	return Quote{Subtotal: subtotal, Shipping: shipping, Total: subtotal.Add(shipping)}, nil
}

func shippingCost(order shop.Order, subtotal shop.Money, option ShippingOption) shop.Money {
	isMember := order.Customer.Tier == shop.Member
	freeShipping := option == Standard || isMember
	if freeShipping && subtotal.AtLeast(freeShippingThreshold) {
		return shop.Zero
	}

	isHeavy := order.WeightGrams() > heavyParcelGrams
	if option == Express {
		if isHeavy {
			return shop.EUR(1890)
		}
		return shop.EUR(1290)
	}
	if isHeavy {
		return shop.EUR(690)
	}
	return shop.EUR(490)
}
