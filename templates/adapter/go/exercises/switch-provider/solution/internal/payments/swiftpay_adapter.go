package payments

import (
	"errors"
	"fmt"

	"example.com/shop/internal/shop"
	"example.com/shop/internal/swiftpay"
)

type SwiftPayAdapter struct {
	client *swiftpay.Client
}

var _ Gateway = (*SwiftPayAdapter)(nil)

func NewSwiftPayAdapter(client *swiftpay.Client) *SwiftPayAdapter {
	return &SwiftPayAdapter{client: client}
}

func swiftPayAmountOf(amount shop.Money) swiftpay.Amount {
	cents := amount.Cents()
	return swiftpay.Amount{Value: fmt.Sprintf("%d.%02d", cents/100, cents%100), Currency: amount.Currency()}
}

func (a *SwiftPayAdapter) Charge(amount shop.Money, card shop.Card) ChargeResult {
	charge, err := a.client.CreateCharge(swiftpay.ChargeParams{Amount: swiftPayAmountOf(amount), Source: card.Token})
	if err != nil {
		return chargeFailureOf(err)
	}
	return ChargeResult{Status: Approved, PaymentID: charge.ID}
}

func (a *SwiftPayAdapter) Refund(paymentID string, amount shop.Money) error {
	if err := a.client.CreateRefund(swiftpay.RefundParams{Charge: paymentID, Amount: swiftPayAmountOf(amount)}); err != nil {
		return ErrRefundRejected
	}
	return nil
}

func chargeFailureOf(err error) ChargeResult {
	var swiftPayErr *swiftpay.Error
	if !errors.As(err, &swiftPayErr) {
		return ChargeResult{Status: Declined, Reason: Refused}
	}
	switch swiftPayErr.Code {
	case swiftpay.InsufficientFunds:
		return ChargeResult{Status: Declined, Reason: InsufficientFunds}
	case swiftpay.ExpiredCard:
		return ChargeResult{Status: Declined, Reason: ExpiredCard}
	case swiftpay.TryAgain:
		return ChargeResult{Status: Unavailable}
	default:
		return ChargeResult{Status: Declined, Reason: Refused}
	}
}
