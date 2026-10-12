package checkout

import (
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/shop"
)

type Cancellation struct {
	client *legacypay.Client
}

func (c *Cancellation) Cancel(paymentID string, amount shop.Money) CancellationStatus {
	if c.client.ReversePayment(paymentID, amount.Cents()).Code == legacypay.CodeApproved {
		return Refunded
	}
	return RefundFailed
}
