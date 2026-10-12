package checkout

import (
	"fmt"

	"example.com/shop/internal/memstore"
	"example.com/shop/internal/shop"
	"example.com/shop/internal/smtp"
)

type Service struct {
	orders   *memstore.OrderStore
	notifier *smtp.Mailer
}

func NewService() *Service {
	return &Service{
		orders:   memstore.New(),
		notifier: smtp.New("smtp.shop.example", 587),
	}
}

func (s *Service) PlaceOrder(order shop.Order) (memstore.OrderID, error) {
	orderID, err := s.orders.Add(order)
	if err != nil {
		return "", err
	}
	message := fmt.Sprintf("Order %s confirmed: %s", orderID, order.Total())
	return orderID, s.notifier.Notify(order.Customer.Email, message)
}

func (s *Service) FindOrder(orderID memstore.OrderID) (shop.Order, bool) {
	return s.orders.Find(orderID)
}
