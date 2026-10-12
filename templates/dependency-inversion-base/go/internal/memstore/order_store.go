package memstore

import (
	"fmt"

	"example.com/shop/internal/shop"
)

type OrderID string

type OrderStore struct {
	orders map[OrderID]shop.Order
}

func New() *OrderStore {
	return &OrderStore{orders: map[OrderID]shop.Order{}}
}

func (s *OrderStore) Add(order shop.Order) (OrderID, error) {
	id := OrderID(fmt.Sprintf("order-%d", len(s.orders)+1))
	s.orders[id] = order
	return id, nil
}

func (s *OrderStore) Find(id OrderID) (shop.Order, bool) {
	order, ok := s.orders[id]
	return order, ok
}
