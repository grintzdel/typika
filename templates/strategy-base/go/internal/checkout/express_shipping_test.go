package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

func TestExpressShipping(t *testing.T) {
	tests := []struct {
		name  string
		order shop.Order
		want  shop.Money
	}{
		{"charges 12.90 for orders up to 2 kg", orderOf(shop.Regular, 3000, 1500), shop.EUR(1290)},
		{"charges 18.90 for orders over 2 kg", orderOf(shop.Regular, 3000, 2500), shop.EUR(1890)},
		{"is never free for regular customers", orderOf(shop.Regular, 20000, 1000), shop.EUR(1290)},
		{"is free for members from 50.00", orderOf(shop.Member, 5000, 2500), shop.EUR(0)},
		{"is paid by members under 50.00", orderOf(shop.Member, 4999, 1000), shop.EUR(1290)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := quoteFor(t, tt.order, checkout.Express).Shipping; got != tt.want {
				t.Errorf("shipping = %v, want %v", got, tt.want)
			}
		})
	}
}
