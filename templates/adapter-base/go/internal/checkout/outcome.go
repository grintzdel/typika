package checkout

import "example.com/shop/internal/shop"

type PaymentStatus string

const (
	Paid       PaymentStatus = "paid"
	Declined   PaymentStatus = "declined"
	RetryLater PaymentStatus = "retry-later"
)

type PaymentOutcome struct {
	Status    PaymentStatus
	PaymentID string
	Amount    shop.Money
	Message   string
}

type CancellationStatus string

const (
	Refunded     CancellationStatus = "refunded"
	RefundFailed CancellationStatus = "refund-failed"
)
