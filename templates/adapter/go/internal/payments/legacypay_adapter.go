package payments

import (
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/shop"
)

var numericCurrencyCodes = map[string]int{"EUR": 978}

// #region tour:translation
type LegacyPayAdapter struct {
	client *legacypay.Client
}

var _ Gateway = (*LegacyPayAdapter)(nil)

func NewLegacyPayAdapter(client *legacypay.Client) *LegacyPayAdapter {
	return &LegacyPayAdapter{client: client}
}

func (a *LegacyPayAdapter) Charge(amount shop.Money, card shop.Card) ChargeResult {
	response := a.client.MakePayment(amount.Cents(), numericCurrencyCodes[amount.Currency()], card.Token)
	return chargeResultOf(response)
}

func (a *LegacyPayAdapter) Refund(paymentID string, amount shop.Money) error {
	if a.client.ReversePayment(paymentID, amount.Cents()).Code != legacypay.CodeApproved {
		return ErrRefundRejected
	}
	return nil
}

// #endregion

// #region tour:error-mapping
func chargeResultOf(response legacypay.Response) ChargeResult {
	switch response.Code {
	case legacypay.CodeApproved:
		return ChargeResult{Status: Approved, PaymentID: response.Reference}
	case legacypay.CodeInsufficientFunds:
		return ChargeResult{Status: Declined, Reason: InsufficientFunds}
	case legacypay.CodeExpiredCard:
		return ChargeResult{Status: Declined, Reason: ExpiredCard}
	case legacypay.CodeIssuerUnavailable:
		return ChargeResult{Status: Unavailable}
	default:
		return ChargeResult{Status: Declined, Reason: Refused}
	}
}

// #endregion
