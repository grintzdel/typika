package infra

import (
	"fmt"
	"slices"
	"sync"
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

type OutboxEntry struct {
	ID        int
	Topic     string
	Payload   []byte
	Published bool
}

type InMemoryDatabase struct {
	mu          sync.Mutex
	orders      []OrderRow
	outbox      []OutboxEntry
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

func (db *InMemoryDatabase) AddToOutbox(topic string, payload []byte) {
	db.outbox = append(db.outbox, OutboxEntry{ID: len(db.outbox) + 1, Topic: topic, Payload: payload})
}

func (db *InMemoryDatabase) PendingOutbox() []OutboxEntry {
	db.mu.Lock()
	defer db.mu.Unlock()
	var pending []OutboxEntry
	for _, entry := range db.outbox {
		if !entry.Published {
			pending = append(pending, entry)
		}
	}
	return pending
}

func (db *InMemoryDatabase) MarkPublished(id int) {
	db.mu.Lock()
	defer db.mu.Unlock()
	db.outbox[id-1].Published = true
}

// #region tour:transaction
func (db *InMemoryDatabase) Transaction(work func() error) error {
	db.mu.Lock()
	defer db.mu.Unlock()
	orders := slices.Clone(db.orders)
	outboxSize := len(db.outbox)
	lastOrderID := db.lastOrderID
	if err := work(); err != nil {
		db.orders = orders
		db.outbox = db.outbox[:outboxSize]
		db.lastOrderID = lastOrderID
		return err
	}
	return nil
}

// #endregion
