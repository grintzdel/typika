package checkout

import "example.com/shop/internal/shop"

func ExpressShipping(order shop.Order) shop.Money {
	isMember := order.Customer.Tier == shop.Member
	if isMember && order.Subtotal().AtLeast(freeShippingThreshold) {
		return shop.Zero
	}
	if order.WeightGrams() > heavyParcelGrams {
		return shop.EUR(1890)
	}
	return shop.EUR(1290)
}
