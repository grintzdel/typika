package orders

import (
	"time"

	"example.com/shop/internal/shop"
)

type CustomerHistory struct {
	OrderCount int
	TotalSpent shop.Money
	LastStatus Status
}

type NotificationKind string

const (
	ConfirmedNotice NotificationKind = "order-confirmed"
	ShippedNotice   NotificationKind = "order-shipped"
	CancelledNotice NotificationKind = "order-cancelled"
)

type Notification struct {
	Kind   NotificationKind
	Order  Order
	Reason string
}

type EventType string

const (
	OrderPlaced    EventType = "OrderPlaced"
	OrderPaid      EventType = "OrderPaid"
	OrderShipped   EventType = "OrderShipped"
	OrderDelivered EventType = "OrderDelivered"
	OrderCancelled EventType = "OrderCancelled"
)

type Event struct {
	Type  EventType
	Order Order
}

// #region tour:ports
type OrderRepository interface {
	Add(order Order) Order
	Update(order Order)
	Find(id string) (Order, bool)
	FindByCustomer(email string) []Order
}

type PaymentGateway interface {
	Charge(amount shop.Money, cardToken string) (paymentID string, err error)
	Refund(paymentID string)
}

type Notifier interface {
	Notify(notification Notification)
}

type EventPublisher interface {
	Publish(event Event) error
}

type Clock interface {
	Now() time.Time
}

// #endregion
