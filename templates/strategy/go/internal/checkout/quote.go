package checkout

import "example.com/shop/internal/shop"

type Quote struct {
	Subtotal shop.Money
	Shipping shop.Money
	Total    shop.Money
}

// #region tour:context
func QuoteWith(shippingCost ShippingCost, order shop.Order) Quote {
	subtotal := order.Subtotal()
	shipping := shippingCost(order)
	return Quote{Subtotal: subtotal, Shipping: shipping, Total: subtotal.Add(shipping)}
}

// #endregion
