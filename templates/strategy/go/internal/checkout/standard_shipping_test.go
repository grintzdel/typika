package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

func TestStandardShipping(t *testing.T) {
	tests := []struct {
		name  string
		order shop.Order
		want  shop.Money
	}{
		{"charges 4.90 for orders up to 2 kg", orderOf(shop.Regular, 3000, 2000), shop.EUR(490)},
		{"charges 6.90 for orders over 2 kg", orderOf(shop.Regular, 3000, 2001), shop.EUR(690)},
		{"is free from 50.00, whatever the weight", orderOf(shop.Regular, 5000, 9000), shop.EUR(0)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := quoteFor(t, tt.order, checkout.Standard).Shipping; got != tt.want {
				t.Errorf("shipping = %v, want %v", got, tt.want)
			}
		})
	}
}
