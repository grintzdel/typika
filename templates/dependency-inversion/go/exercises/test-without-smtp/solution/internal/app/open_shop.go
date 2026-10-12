package app

import (
	"example.com/shop/internal/checkout"
	"example.com/shop/internal/memstore"
	"example.com/shop/internal/smtp"
)

type Shop struct {
	Checkout *checkout.Service
}

// #region tour:composition-root
func OpenShop() Shop {
	return Shop{
		Checkout: checkout.New(memstore.New(), smtp.New("smtp.shop.example", 587)),
	}
}

// #endregion
