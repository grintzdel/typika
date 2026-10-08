package checkout

import "example.com/shop/internal/shop"

// #region tour:contract
type ShippingCost func(order shop.Order) shop.Money

// #endregion
