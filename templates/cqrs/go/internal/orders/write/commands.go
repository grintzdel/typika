package write

import (
	"errors"

	"example.com/shop/internal/infra"
)

var (
	ErrInvalidOrder    = errors.New("invalid order")
	ErrOrderNotFound   = errors.New("order not found")
	ErrConflict        = errors.New("conflict")
	ErrPaymentDeclined = errors.New("payment declined")
)

// #region tour:commands
type Customer struct {
	Name  string
	Email string
}

type PlaceOrder struct {
	Customer Customer
	Lines    []infra.OrderLineRow
}

type PayOrder struct {
	OrderID   string
	CardToken string
}

type ShipOrder struct {
	OrderID string
}

type DeliverOrder struct {
	OrderID string
}

type CancelOrder struct {
	OrderID string
	Reason  string
}

// #endregion
