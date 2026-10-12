package checkout

import (
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/shop"
)

const eurNumericCode = 978

type Checkout struct {
	client *legacypay.Client
}

func (c *Checkout) Pay(order shop.Order, card shop.Card) PaymentOutcome {
	amount := order.Total()
	response := c.client.MakePayment(amount.Cents(), eurNumericCode, card.Token)

	switch response.Code {
	case legacypay.CodeApproved:
		return PaymentOutcome{Status: Paid, PaymentID: response.Reference, Amount: amount}
	case legacypay.CodeInsufficientFunds:
		return PaymentOutcome{Status: Declined, Message: "Your card was declined: insufficient funds."}
	case legacypay.CodeExpiredCard:
		return PaymentOutcome{Status: Declined, Message: "Your card has expired."}
	case legacypay.CodeIssuerUnavailable:
		return PaymentOutcome{Status: RetryLater}
	default:
		return PaymentOutcome{Status: Declined, Message: "Your card was declined."}
	}
}
