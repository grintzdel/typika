package events

import "time"

type Type string

const (
	OrderPlaced    Type = "OrderPlaced"
	OrderPaid      Type = "OrderPaid"
	OrderShipped   Type = "OrderShipped"
	OrderDelivered Type = "OrderDelivered"
	OrderCancelled Type = "OrderCancelled"
)

type Status string

const (
	Pending   Status = "pending"
	Paid      Status = "paid"
	Shipped   Status = "shipped"
	Delivered Status = "delivered"
	Cancelled Status = "cancelled"
)

type Event struct {
	Type          Type      `json:"-"`
	OrderID       string    `json:"orderId"`
	CustomerEmail string    `json:"customerEmail,omitempty"`
	TotalCents    int64     `json:"totalCents,omitempty"`
	OccurredAt    time.Time `json:"-"`
}

var statusAfter = map[Type]Status{
	OrderPlaced:    Pending,
	OrderPaid:      Paid,
	OrderShipped:   Shipped,
	OrderDelivered: Delivered,
	OrderCancelled: Cancelled,
}

func (e Event) StatusAfter() Status {
	return statusAfter[e.Type]
}
