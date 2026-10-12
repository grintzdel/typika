package orders_test

import (
	"errors"
	"reflect"
	"testing"
	"time"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
	"example.com/shop/internal/orders/adapters"
	"example.com/shop/internal/shop"
)

type approvingPayments struct{}

func (approvingPayments) Charge(shop.Money, string) (string, error) { return "pay-1", nil }

func (approvingPayments) Refund(string) {}

type recordingNotifier struct {
	sent []orders.Notification
}

func (n *recordingNotifier) Notify(notification orders.Notification) {
	n.sent = append(n.sent, notification)
}

type silentEvents struct{}

func (silentEvents) Publish(orders.Event) error { return nil }

type fixedClock struct{}

func (fixedClock) Now() time.Time { return time.Date(2026, 10, 1, 9, 0, 0, 0, time.UTC) }

func serviceNotifying(notifier *recordingNotifier) *orders.Service {
	repository := adapters.NewInMemoryOrderRepository(infra.NewInMemoryDatabase())
	return orders.NewService(repository, approvingPayments{}, notifier, silentEvents{}, fixedClock{})
}

func orderOf(totalCents int64) orders.OrderRequest {
	return orders.OrderRequest{
		Customer: orders.Customer{Name: "Ada", Email: "ada@example.com"},
		Lines:    []orders.LineRequest{{SKU: "TEST-SKU", UnitPriceCents: totalCents, Quantity: 1}},
	}
}

func TestOrderService(t *testing.T) {
	t.Run("places an order without any HTTP request", func(t *testing.T) {
		notifier := &recordingNotifier{}

		order, err := serviceNotifying(notifier).PlaceOrder(orderOf(3250))

		if err != nil {
			t.Fatal(err)
		}
		if order.Total != shop.EUR(3250) {
			t.Errorf("total = %s, want 32.50 EUR", order.Total)
		}
		want := []orders.Notification{{Kind: orders.ConfirmedNotice, Order: order}}
		if !reflect.DeepEqual(notifier.sent, want) {
			t.Errorf("notifications = %+v, want %+v", notifier.sent, want)
		}
	})

	t.Run("refuses to ship an unpaid order with a domain error", func(t *testing.T) {
		service := serviceNotifying(&recordingNotifier{})
		order, err := service.PlaceOrder(orderOf(3250))
		if err != nil {
			t.Fatal(err)
		}

		if _, err := service.ShipOrder(order.ID); !errors.Is(err, orders.ErrConflict) {
			t.Errorf("err = %v, want a conflict", err)
		}
	})
}
