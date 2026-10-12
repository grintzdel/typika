package app

import "example.com/shop/internal/checkout"

type Shop struct {
	Checkout *checkout.Service
}

func OpenShop() Shop {
	return Shop{Checkout: checkout.NewService()}
}
