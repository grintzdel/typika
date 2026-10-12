package app_test

import "example.com/shop/internal/shop"

var (
	ada   = shop.Customer{Name: "Ada", Email: "ada@example.com", Tier: shop.Regular}
	grace = shop.Customer{Name: "Grace", Email: "grace@example.com", Tier: shop.Member}
)

func orderOf(customer shop.Customer, totalCents int64) shop.Order {
	return shop.Order{
		Customer: customer,
		Lines:    []shop.OrderLine{{SKU: "TEST-SKU", UnitPrice: shop.EUR(totalCents), Quantity: 1}},
	}
}
