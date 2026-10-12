package checkout

import (
	"fmt"

	"example.com/shop/internal/shop"
)

// #region tour:inject
type Service struct {
	orders   OrderRepository
	notifier Notifier
}

func New(orders OrderRepository, notifier Notifier) *Service {
	return &Service{orders: orders, notifier: notifier}
}

func (s *Service) PlaceOrder(order shop.Order) (OrderID, error) {
	orderID, err := s.orders.Add(order)
	if err != nil {
		return "", err
	}
	message := fmt.Sprintf("Order %s confirmed: %s", orderID, order.Total())
	return orderID, s.notifier.Notify(order.Customer.Email, message)
}

// #endregion

func (s *Service) FindOrder(orderID OrderID) (shop.Order, bool) {
	return s.orders.Find(orderID)
}
