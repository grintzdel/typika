package infra

import (
	"fmt"
	"slices"
	"time"
)

type OrderLineRow struct {
	SKU            string
	UnitPriceCents int64
	Quantity       int
}

type OrderRow struct {
	ID            string
	CustomerEmail string
	CustomerName  string
	Lines         []OrderLineRow
	TotalCents    int64
	PlacedAt      time.Time
	ChargeID      string
	DeliveredAt   time.Time
	IsPaid        bool
	IsShipped     bool
	IsDelivered   bool
	IsCancelled   bool
}

type InMemoryDatabase struct {
	orders      []OrderRow
	lastOrderID int
}

func NewInMemoryDatabase() *InMemoryDatabase {
	return &InMemoryDatabase{}
}

func (db *InMemoryDatabase) NextOrderID() string {
	db.lastOrderID++
	return fmt.Sprintf("order-%d", db.lastOrderID)
}

func (db *InMemoryDatabase) SaveOrder(row OrderRow) {
	i := slices.IndexFunc(db.orders, func(saved OrderRow) bool { return saved.ID == row.ID })
	if i < 0 {
		db.orders = append(db.orders, row)
		return
	}
	db.orders[i] = row
}

func (db *InMemoryDatabase) FindOrder(id string) (OrderRow, bool) {
	i := slices.IndexFunc(db.orders, func(saved OrderRow) bool { return saved.ID == id })
	if i < 0 {
		return OrderRow{}, false
	}
	return db.orders[i], true
}

func (db *InMemoryDatabase) Orders() []OrderRow {
	return slices.Clone(db.orders)
}
