package infra_test

import (
	"errors"
	"testing"

	"example.com/shop/internal/infra"
)

func TestDatabaseTransaction(t *testing.T) {
	t.Run("keeps the order and its outbox entry together when the work fails", func(t *testing.T) {
		db := infra.NewInMemoryDatabase()
		errDiskFull := errors.New("disk full")

		err := db.Transaction(func() error {
			id := db.NextOrderID()
			db.SaveOrder(infra.OrderRow{ID: id})
			db.AddToOutbox("OrderPlaced", []byte(`{"orderId":"`+id+`"}`))
			return errDiskFull
		})

		if !errors.Is(err, errDiskFull) {
			t.Errorf("err = %v, want disk full", err)
		}
		if _, found := db.FindOrder("order-1"); found {
			t.Error("order-1 was saved")
		}
		if pending := db.PendingOutbox(); len(pending) != 0 {
			t.Errorf("outbox = %v, want empty", pending)
		}
		if id := db.NextOrderID(); id != "order-1" {
			t.Errorf("next id = %s, want order-1", id)
		}
	})
}
