package checkout

import (
	"fmt"

	"example.com/shop/internal/shop"
)

// #region tour:choice
var shippingCosts = map[ShippingOption]ShippingCost{
	Standard:    StandardShipping,
	Express:     ExpressShipping,
	PickupPoint: PickupPointShipping,
}

func QuoteShipping(order shop.Order, option ShippingOption) (Quote, error) {
	shippingCost, ok := shippingCosts[option]
	if !ok {
		return Quote{}, fmt.Errorf("unknown shipping option %q", option)
	}
	return QuoteWith(shippingCost, order), nil
}

// #endregion
