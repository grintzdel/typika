package checkout

import (
	"fmt"

	"example.com/shop/internal/payments"
)

type Refunds struct {
	gateways map[payments.Method]payments.PaymentGateway
}

func NewRefunds(gateways map[payments.Method]payments.PaymentGateway) *Refunds {
	return &Refunds{gateways: gateways}
}

func (r *Refunds) Refund(payment payments.Payment) error {
	gateway, ok := r.gateways[payment.Method]
	if !ok {
		return fmt.Errorf("payments by %s cannot be refunded", payment.Method)
	}
	return gateway.Refund(payment)
}
