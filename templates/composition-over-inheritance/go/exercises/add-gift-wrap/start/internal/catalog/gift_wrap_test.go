package catalog_test

import (
	"testing"

	"example.com/shop/internal/catalog"
	"example.com/shop/internal/shop"
)

func TestGiftWrap(t *testing.T) {
	t.Run("wraps a physical product for 3.50 more", func(t *testing.T) {
		assertSheet(t, "MUG-01-GIFT", sheet{shop.EUR(1550), catalog.Parcel, []string{"cardboard box", "gift wrap"}})
	})

	t.Run("wraps a perishable product, still shipped refrigerated", func(t *testing.T) {
		assertSheet(t, "CHEESE-01-GIFT", sheet{shop.EUR(1240), catalog.Refrigerated, []string{"insulated box", "gift wrap"}})
	})

	t.Run("adds the fee after the discount of a discounted product", func(t *testing.T) {
		assertSheet(t, "MUG-02-GIFT", sheet{shop.EUR(1470), catalog.Parcel, []string{"cardboard box", "gift wrap"}})
	})

	t.Run("leaves the products without gift wrap unchanged", func(t *testing.T) {
		assertSheet(t, "MUG-01", sheet{shop.EUR(1200), catalog.Parcel, []string{"cardboard box"}})
	})
}
