package orders

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"example.com/shop/internal/shop"
)

type Status string

const (
	Pending   Status = "pending"
	Paid      Status = "paid"
	Shipped   Status = "shipped"
	Delivered Status = "delivered"
	Cancelled Status = "cancelled"
)

type Customer struct {
	Name  string
	Email string
}

type Line struct {
	SKU       string
	UnitPrice shop.Money
	Quantity  int
}

type Order struct {
	ID          string
	Customer    Customer
	Lines       []Line
	Total       shop.Money
	PlacedAt    time.Time
	ChargeID    string
	DeliveredAt time.Time
	IsPaid      bool
	IsShipped   bool
	IsDelivered bool
	IsCancelled bool
}

type LineRequest struct {
	SKU            string
	UnitPriceCents int64
	Quantity       int
}

type OrderRequest struct {
	Customer Customer
	Lines    []LineRequest
}

var (
	ErrInvalidOrder    = errors.New("invalid order")
	ErrOrderNotFound   = errors.New("order not found")
	ErrConflict        = errors.New("conflict")
	ErrPaymentDeclined = errors.New("payment declined")
)

// #region tour:domain
func NewOrder(request OrderRequest, placedAt time.Time) (Order, error) {
	if request.Customer.Name == "" {
		return Order{}, fmt.Errorf("%w: a customer name is required", ErrInvalidOrder)
	}
	if !strings.Contains(request.Customer.Email, "@") {
		return Order{}, fmt.Errorf("%w: a valid customer email is required", ErrInvalidOrder)
	}
	if len(request.Lines) == 0 {
		return Order{}, fmt.Errorf("%w: an order needs at least one line", ErrInvalidOrder)
	}

	order := Order{Customer: request.Customer, Total: shop.Zero, PlacedAt: placedAt}
	for _, line := range request.Lines {
		if line.SKU == "" {
			return Order{}, fmt.Errorf("%w: each line needs a sku", ErrInvalidOrder)
		}
		if line.UnitPriceCents <= 0 || line.Quantity <= 0 {
			return Order{}, fmt.Errorf("%w: line %s needs a positive price and quantity", ErrInvalidOrder, line.SKU)
		}
		unitPrice := shop.EUR(line.UnitPriceCents)
		order.Lines = append(order.Lines, Line{SKU: line.SKU, UnitPrice: unitPrice, Quantity: line.Quantity})
		order.Total = order.Total.Add(unitPrice.Times(line.Quantity))
	}
	return order, nil
}

// #endregion

func (o Order) EnsurePayable() error {
	if o.IsCancelled {
		return fmt.Errorf("%w: order %s is cancelled", ErrConflict, o.ID)
	}
	if o.IsPaid {
		return fmt.Errorf("%w: order %s is already paid", ErrConflict, o.ID)
	}
	return nil
}

func (o *Order) MarkPaid(chargeID string) {
	o.IsPaid = true
	o.ChargeID = chargeID
}

func (o *Order) Ship() error {
	if o.IsCancelled {
		return fmt.Errorf("%w: order %s is cancelled", ErrConflict, o.ID)
	}
	if !o.IsPaid {
		return fmt.Errorf("%w: order %s is not paid", ErrConflict, o.ID)
	}
	if o.IsShipped {
		return fmt.Errorf("%w: order %s has already shipped", ErrConflict, o.ID)
	}
	o.IsShipped = true
	return nil
}

func (o *Order) Deliver(at time.Time) error {
	if !o.IsShipped || o.IsDelivered {
		return fmt.Errorf("%w: order %s is not on its way", ErrConflict, o.ID)
	}
	o.IsDelivered = true
	o.DeliveredAt = at
	return nil
}

func (o *Order) Cancel() error {
	if o.IsShipped {
		return fmt.Errorf("%w: order %s has already shipped", ErrConflict, o.ID)
	}
	if o.IsCancelled {
		return fmt.Errorf("%w: order %s is already cancelled", ErrConflict, o.ID)
	}
	o.IsCancelled = true
	return nil
}

func (o Order) Status() Status {
	switch {
	case o.IsCancelled:
		return Cancelled
	case o.IsDelivered:
		return Delivered
	case o.IsShipped:
		return Shipped
	case o.IsPaid:
		return Paid
	default:
		return Pending
	}
}
