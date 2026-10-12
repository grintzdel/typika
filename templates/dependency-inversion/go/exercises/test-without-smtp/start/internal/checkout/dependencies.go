package checkout

import "example.com/shop/internal/shop"

type OrderID string

type Notifier interface {
	Notify(recipient, message string) error
}

type OrderRepository interface {
	Add(order shop.Order) (OrderID, error)
	Find(id OrderID) (shop.Order, bool)
}

func New(orders OrderRepository, notifier Notifier) *Service {
	return NewService()
}
