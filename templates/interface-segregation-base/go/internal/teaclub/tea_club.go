package teaclub

import (
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

var monthlyFee = shop.EUR(990)

type TeaClub struct {
	gateway payments.PaymentGateway
}

func New(gateway payments.PaymentGateway) *TeaClub {
	return &TeaClub{gateway: gateway}
}

func (c *TeaClub) Join(card payments.CardToken) error {
	return c.gateway.Subscribe(card, monthlyFee)
}
