package checkout

import (
	"fmt"

	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

type Checkout struct {
	gateways map[payments.Method]payments.PaymentGateway
}

func New(gateways map[payments.Method]payments.PaymentGateway) *Checkout {
	return &Checkout{gateways: gateways}
}

func (c *Checkout) Pay(method payments.Method, amount shop.Money) (payments.Payment, error) {
	gateway, ok := c.gateways[method]
	if !ok {
		return payments.Payment{}, fmt.Errorf("unknown payment method %q", method)
	}
	return gateway.Charge(amount)
}
