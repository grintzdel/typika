package checkout

import (
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

var declineMessages = map[payments.DeclineReason]string{
	payments.InsufficientFunds: "Your card was declined: insufficient funds.",
	payments.ExpiredCard:       "Your card has expired.",
	payments.Refused:           "Your card was declined.",
}

// #region tour:client
type Checkout struct {
	payments payments.Gateway
}

func (c *Checkout) Pay(order shop.Order, card shop.Card) PaymentOutcome {
	amount := order.Total()
	result := c.payments.Charge(amount, card)

	switch result.Status {
	case payments.Approved:
		return PaymentOutcome{Status: Paid, PaymentID: result.PaymentID, Amount: amount}
	case payments.Declined:
		return PaymentOutcome{Status: Declined, Message: declineMessages[result.Reason]}
	default:
		return PaymentOutcome{Status: RetryLater}
	}
}

// #endregion
