package checkout_test

import "example.com/shop/internal/shop"

var order = shop.Order{
	Customer: shop.Customer{Name: "Ada", Tier: shop.Regular},
	Lines: []shop.OrderLine{
		{SKU: "MUG-01", UnitPrice: shop.EUR(1200), Quantity: 2},
		{SKU: "TEA-GREEN", UnitPrice: shop.EUR(850), Quantity: 1},
	},
}
