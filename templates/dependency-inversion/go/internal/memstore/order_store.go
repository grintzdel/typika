package memstore

import (
	"fmt"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

type OrderStore struct {
	orders map[checkout.OrderID]shop.Order
}

func New() *OrderStore {
	return &OrderStore{orders: map[checkout.OrderID]shop.Order{}}
}

func (s *OrderStore) Add(order shop.Order) (checkout.OrderID, error) {
	id := checkout.OrderID(fmt.Sprintf("order-%d", len(s.orders)+1))
	s.orders[id] = order
	return id, nil
}

func (s *OrderStore) Find(id checkout.OrderID) (shop.Order, bool) {
	order, ok := s.orders[id]
	return order, ok
}
