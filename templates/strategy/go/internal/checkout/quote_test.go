package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

func TestQuote(t *testing.T) {
	order := shop.Order{
		Customer: shop.Customer{Name: "Ada", Tier: shop.Regular},
		Lines: []shop.OrderLine{
			{SKU: "MUG-01", UnitPrice: shop.EUR(1200), Quantity: 2, UnitWeightGrams: 400},
			{SKU: "TEA-GREEN", UnitPrice: shop.EUR(850), Quantity: 1, UnitWeightGrams: 250},
		},
	}

	t.Run("sums every line into the subtotal", func(t *testing.T) {
		if got, want := quoteFor(t, order, checkout.Standard).Subtotal, shop.EUR(3250); got != want {
			t.Errorf("subtotal = %v, want %v", got, want)
		}
	})

	t.Run("adds the shipping cost to the subtotal", func(t *testing.T) {
		if got, want := quoteFor(t, order, checkout.Standard).Total, shop.EUR(3740); got != want {
			t.Errorf("total = %v, want %v", got, want)
		}
	})
}
