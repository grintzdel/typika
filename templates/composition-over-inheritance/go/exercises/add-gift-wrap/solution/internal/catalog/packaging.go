package catalog

import (
	"slices"

	"example.com/shop/internal/shop"
)

type Packaging struct {
	Materials []string
	Fee       shop.Money
}

var giftWrapFee = shop.EUR(350)

var (
	NoPackaging  = Packaging{Fee: shop.Zero}
	CardboardBox = Packaging{Materials: []string{"cardboard box"}, Fee: shop.Zero}
	InsulatedBox = Packaging{Materials: []string{"insulated box"}, Fee: shop.Zero}
)

func GiftWrapped(packaging Packaging) Packaging {
	return Packaging{
		Materials: append(slices.Clone(packaging.Materials), "gift wrap"),
		Fee:       packaging.Fee.Add(giftWrapFee),
	}
}
