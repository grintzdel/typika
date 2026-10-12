package read_test

import (
	"testing"
	"time"

	"example.com/shop/internal/orders/events"
	"example.com/shop/internal/orders/read"
)

var occurredAt = time.Date(2026, 10, 1, 9, 0, 0, 0, time.UTC)

func placed(orderID string, totalCents int64) events.Event {
	return events.Event{
		Type:          events.OrderPlaced,
		OrderID:       orderID,
		CustomerEmail: "ada@example.com",
		TotalCents:    totalCents,
		OccurredAt:    occurredAt,
	}
}

func paid(orderID string, totalCents int64) events.Event {
	return events.Event{Type: events.OrderPaid, OrderID: orderID, TotalCents: totalCents, OccurredAt: occurredAt}
}

func TestCustomerOrderSummaries(t *testing.T) {
	t.Run("builds a summary from events alone, without reading any order", func(t *testing.T) {
		summaries := read.NewCustomerOrderSummaries()

		summaries.Apply(placed("order-1", 3250))
		summaries.Apply(paid("order-1", 3250))

		want := read.CustomerOrderSummary{OrderCount: 1, TotalSpentCents: 3250, LastStatus: events.Paid}
		if got := summaries.ForCustomer("ada@example.com"); got != want {
			t.Errorf("summary = %+v, want %+v", got, want)
		}
	})

	t.Run("shows the status of the latest order, whatever happens to older ones", func(t *testing.T) {
		summaries := read.NewCustomerOrderSummaries()

		summaries.Apply(placed("order-1", 3250))
		summaries.Apply(placed("order-2", 1000))
		summaries.Apply(paid("order-1", 3250))

		if status := summaries.ForCustomer("ada@example.com").LastStatus; status != events.Pending {
			t.Errorf("last status = %s, want pending", status)
		}
	})
}
