package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

func orderOf(tier shop.Tier, subtotalCents int64, weightGrams int) shop.Order {
	return shop.Order{
		Customer: shop.Customer{Name: "Test customer", Tier: tier},
		Lines: []shop.OrderLine{
			{SKU: "TEST-SKU", UnitPrice: shop.EUR(subtotalCents), Quantity: 1, UnitWeightGrams: weightGrams},
		},
	}
}

func quoteFor(t *testing.T, order shop.Order, option checkout.ShippingOption) checkout.Quote {
	t.Helper()
	quote, err := checkout.QuoteShipping(order, option)
	if err != nil {
		t.Fatal(err)
	}
	return quote
}
