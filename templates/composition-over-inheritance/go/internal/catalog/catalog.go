package catalog

import (
	"fmt"

	"example.com/shop/internal/shop"
)

var Catalog = []Product{
	NewProduct("EBOOK-TEA", "The tea lover's guide (e-book)", shop.EUR(990), Policies{
		Pricing:   FullPrice,
		Shipping:  NoShipping,
		Packaging: NoPackaging,
	}),
	NewProduct("MUG-01", "Stoneware mug", shop.EUR(1200), Policies{
		Pricing:   FullPrice,
		Shipping:  Parcel,
		Packaging: CardboardBox,
	}),
	NewProduct("CHEESE-01", "Aged comté, 250 g", shop.EUR(890), Policies{
		Pricing:   FullPrice,
		Shipping:  Refrigerated,
		Packaging: InsulatedBox,
	}),
	NewProduct("YOGURT-01", "Organic yogurt, best before tomorrow", shop.EUR(450), Policies{
		Pricing:   Discounted(30),
		Shipping:  Refrigerated,
		Packaging: InsulatedBox,
	}),
}

func ProductBySKU(sku SKU) (Product, error) {
	for _, product := range Catalog {
		if product.SKU() == sku {
			return product, nil
		}
	}
	return Product{}, fmt.Errorf("unknown product %s", sku)
}
