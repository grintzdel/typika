package catalog

import (
	"fmt"

	"example.com/shop/internal/shop"
)

var Catalog = []Product{
	NewBasicProduct("EBOOK-TEA", "The tea lover's guide (e-book)", shop.EUR(990)),
	NewPhysicalProduct("MUG-01", "Stoneware mug", shop.EUR(1200)),
	NewPerishableProduct("CHEESE-01", "Aged comté, 250 g", shop.EUR(890)),
	NewDiscountedPerishableProduct("YOGURT-01", "Organic yogurt, best before tomorrow", shop.EUR(450), 30),
}

func ProductBySKU(sku SKU) (Product, error) {
	for _, product := range Catalog {
		if product.SKU() == sku {
			return product, nil
		}
	}
	return nil, fmt.Errorf("unknown product %s", sku)
}
