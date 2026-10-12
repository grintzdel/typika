package checkout

import (
	"fmt"

	"example.com/shop/internal/payments"
)

type Refunder interface {
	Refund(payment payments.Payment) error
}

type Refunds struct {
	methods map[payments.Method]Refunder
}

func NewRefunds(methods map[payments.Method]Refunder) *Refunds {
	return &Refunds{methods: methods}
}

func (r *Refunds) Refund(payment payments.Payment) error {
	refunder, ok := r.methods[payment.Method]
	if !ok {
		return fmt.Errorf("payments by %s cannot be refunded", payment.Method)
	}
	return refunder.Refund(payment)
}
