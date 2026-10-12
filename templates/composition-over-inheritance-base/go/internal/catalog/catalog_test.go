package catalog_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/catalog"
	"example.com/shop/internal/shop"
)

type sheet struct {
	price     shop.Money
	shipping  catalog.ShippingMethod
	packaging []string
}

func assertSheet(t *testing.T, sku catalog.SKU, want sheet) {
	t.Helper()
	product, err := catalog.ProductBySKU(sku)
	if err != nil {
		t.Fatal(err)
	}
	got := sheet{product.Price(), product.ShippingMethod(), product.Packaging()}
	if got.price != want.price || got.shipping != want.shipping || !slices.Equal(got.packaging, want.packaging) {
		t.Errorf("%s = %+v, want %+v", sku, got, want)
	}
}

func TestCatalog(t *testing.T) {
	t.Run("sells e-books without shipping or packaging", func(t *testing.T) {
		assertSheet(t, "EBOOK-TEA", sheet{shop.EUR(990), catalog.NoShipping, nil})
	})

	t.Run("ships physical products as parcels, in a cardboard box", func(t *testing.T) {
		assertSheet(t, "MUG-01", sheet{shop.EUR(1200), catalog.Parcel, []string{"cardboard box"}})
	})

	t.Run("ships perishable products refrigerated, in an insulated box", func(t *testing.T) {
		assertSheet(t, "CHEESE-01", sheet{shop.EUR(890), catalog.Refrigerated, []string{"insulated box"}})
	})

	t.Run("takes the discount off the price of a discounted product", func(t *testing.T) {
		assertSheet(t, "YOGURT-01", sheet{shop.EUR(315), catalog.Refrigerated, []string{"insulated box"}})
	})

	t.Run("refuses an unknown product", func(t *testing.T) {
		_, err := catalog.ProductBySKU("NOPE-01")
		if err == nil || err.Error() != "unknown product NOPE-01" {
			t.Errorf("error = %v, want unknown product NOPE-01", err)
		}
	})
}
