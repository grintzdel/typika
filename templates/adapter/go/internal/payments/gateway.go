package payments

import (
	"errors"

	"example.com/shop/internal/shop"
)

type ChargeStatus string

const (
	Approved    ChargeStatus = "approved"
	Declined    ChargeStatus = "declined"
	Unavailable ChargeStatus = "unavailable"
)

type DeclineReason string

const (
	InsufficientFunds DeclineReason = "insufficient-funds"
	ExpiredCard       DeclineReason = "expired-card"
	Refused           DeclineReason = "refused"
)

type ChargeResult struct {
	Status    ChargeStatus
	PaymentID string
	Reason    DeclineReason
}

var ErrRefundRejected = errors.New("refund rejected")

// #region tour:target
type Gateway interface {
	Charge(amount shop.Money, card shop.Card) ChargeResult
	Refund(paymentID string, amount shop.Money) error
}

// #endregion
