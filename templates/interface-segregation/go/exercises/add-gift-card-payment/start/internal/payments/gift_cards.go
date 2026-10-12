package payments

import "example.com/shop/internal/shop"

type GiftCards interface {
	Redeem(amount shop.Money) (string, error)
}
