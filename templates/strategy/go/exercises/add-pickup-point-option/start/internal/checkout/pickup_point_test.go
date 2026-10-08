package checkout_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

const pickupPoint = checkout.ShippingOption("pickup-point")

func TestPickupPointShipping(t *testing.T) {
	t.Run("is offered next to the other shipping options", func(t *testing.T) {
		if !slices.Contains(checkout.ShippingOptions, pickupPoint) {
			t.Errorf("shipping options = %v, want them to include %q", checkout.ShippingOptions, pickupPoint)
		}
	})

	tests := []struct {
		name   string
		order  shop.Order
		option checkout.ShippingOption
		want   shop.Money
	}{
		{"charges a flat 2.90 for a light order", orderOf(shop.Regular, 1000, 500), pickupPoint, shop.EUR(290)},
		{"charges a flat 2.90 for a heavy order", orderOf(shop.Regular, 1000, 9000), pickupPoint, shop.EUR(290)},
		{"is free from 25.00", orderOf(shop.Regular, 2500, 500), pickupPoint, shop.EUR(0)},
		{"is always free for members", orderOf(shop.Member, 800, 500), pickupPoint, shop.EUR(0)},
		{"leaves standard shipping unchanged between 25.00 and 50.00", orderOf(shop.Regular, 3000, 500), checkout.Standard, shop.EUR(490)},
		{"leaves express shipping paid for members under 50.00", orderOf(shop.Member, 800, 500), checkout.Express, shop.EUR(1290)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := quoteFor(t, tt.order, tt.option).Shipping; got != tt.want {
				t.Errorf("shipping = %v, want %v", got, tt.want)
			}
		})
	}
}
