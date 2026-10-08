package checkout

import "example.com/shop/internal/shop"

type Quote struct {
	Subtotal shop.Money
	Shipping shop.Money
	Total    shop.Money
}
