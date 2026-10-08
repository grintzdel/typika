package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

func TestQuoteWith(t *testing.T) {
	t.Run("uses whichever shipping cost it is given", func(t *testing.T) {
		flatRate := func(shop.Order) shop.Money { return shop.EUR(100) }

		got := checkout.QuoteWith(flatRate, orderOf(shop.Regular, 2000, 500))

		want := checkout.Quote{Subtotal: shop.EUR(2000), Shipping: shop.EUR(100), Total: shop.EUR(2100)}
		if got != want {
			t.Errorf("quote = %+v, want %+v", got, want)
		}
	})
}
