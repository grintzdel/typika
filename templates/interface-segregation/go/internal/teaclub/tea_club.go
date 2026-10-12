package teaclub

import (
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

var monthlyFee = shop.EUR(990)

type Subscriber interface {
	Subscribe(card payments.CardToken, monthlyFee shop.Money) error
}

type TeaClub struct {
	payments Subscriber
}

func New(payments Subscriber) *TeaClub {
	return &TeaClub{payments: payments}
}

func (c *TeaClub) Join(card payments.CardToken) error {
	return c.payments.Subscribe(card, monthlyFee)
}
