package checkout

import "example.com/shop/internal/shop"

func StandardShipping(order shop.Order) shop.Money {
	if order.Subtotal().AtLeast(freeShippingThreshold) {
		return shop.Zero
	}
	if order.WeightGrams() > heavyParcelGrams {
		return shop.EUR(690)
	}
	return shop.EUR(490)
}
