package main

import (
	"fmt"
	"strings"

	"example.com/shop/internal/catalog"
)

func main() {
	for _, product := range catalog.Catalog {
		packaging := strings.Join(product.Packaging(), " + ")
		if packaging == "" {
			packaging = "no packaging"
		}
		fmt.Printf("%-40s %10s\n", product.Name(), product.Price())
		fmt.Printf("  shipping: %s, packaging: %s\n", product.ShippingMethod(), packaging)
	}
}
