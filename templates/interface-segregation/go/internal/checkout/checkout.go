package checkout

import (
	"fmt"

	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

// #region tour:split
type Charger interface {
	Charge(amount shop.Money) (payments.Payment, error)
}

type Checkout struct {
	methods map[payments.Method]Charger
}

func New(methods map[payments.Method]Charger) *Checkout {
	return &Checkout{methods: methods}
}

// #endregion

func (c *Checkout) Pay(method payments.Method, amount shop.Money) (payments.Payment, error) {
	charger, ok := c.methods[method]
	if !ok {
		return payments.Payment{}, fmt.Errorf("unknown payment method %q", method)
	}
	return charger.Charge(amount)
}
