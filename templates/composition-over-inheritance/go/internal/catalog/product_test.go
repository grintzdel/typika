package catalog_test

import (
	"testing"

	"example.com/shop/internal/catalog"
	"example.com/shop/internal/shop"
)

func TestProduct(t *testing.T) {
	t.Run("combines any pricing with any shipping and packaging", func(t *testing.T) {
		discountedEbook := catalog.NewProduct("EBOOK-SALE", "A discounted e-book", shop.EUR(1000), catalog.Policies{
			Pricing:   catalog.Discounted(50),
			Shipping:  catalog.NoShipping,
			Packaging: catalog.NoPackaging,
		})

		if got, want := discountedEbook.Price(), shop.EUR(500); got != want {
			t.Errorf("price = %v, want %v", got, want)
		}
		if got, want := discountedEbook.ShippingMethod(), catalog.NoShipping; got != want {
			t.Errorf("shipping = %v, want %v", got, want)
		}
	})
}
