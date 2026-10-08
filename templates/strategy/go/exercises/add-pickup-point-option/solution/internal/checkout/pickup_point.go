package checkout

import "example.com/shop/internal/shop"

var pickupPointFreeThreshold = shop.EUR(2500)

func PickupPointShipping(order shop.Order) shop.Money {
	if order.Customer.Tier == shop.Member {
		return shop.Zero
	}
	if order.Subtotal().AtLeast(pickupPointFreeThreshold) {
		return shop.Zero
	}
	return shop.EUR(290)
}
