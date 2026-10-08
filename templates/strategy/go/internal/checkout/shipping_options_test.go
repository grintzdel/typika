package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

func TestShippingOptions(t *testing.T) {
	t.Run("prices every shipping option on offer", func(t *testing.T) {
		for _, option := range checkout.ShippingOptions {
			if _, err := checkout.QuoteShipping(orderOf(shop.Regular, 1000, 500), option); err != nil {
				t.Errorf("%s: %v", option, err)
			}
		}
	})
}
