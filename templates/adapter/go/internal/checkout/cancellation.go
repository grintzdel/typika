package checkout

import (
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

type Cancellation struct {
	payments payments.Gateway
}

func (c *Cancellation) Cancel(paymentID string, amount shop.Money) CancellationStatus {
	if err := c.payments.Refund(paymentID, amount); err != nil {
		return RefundFailed
	}
	return Refunded
}
