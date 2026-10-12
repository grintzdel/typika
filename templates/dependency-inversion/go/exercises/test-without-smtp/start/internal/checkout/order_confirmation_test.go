package checkout_test

import (
	"errors"
	"reflect"
	"slices"
	"testing"

	"example.com/shop/internal/checkout"
)

func TestOrderConfirmation(t *testing.T) {
	t.Run("confirms the order to the customer with its total", func(t *testing.T) {
		notifier := &fakeNotifier{}

		if _, err := checkout.New(newFakeOrders(), notifier).PlaceOrder(orderOf(grace, 5990)); err != nil {
			t.Fatal(err)
		}

		want := []string{"grace@example.com: Order order-1 confirmed: 59.90 EUR"}
		if !slices.Equal(notifier.sent, want) {
			t.Errorf("sent = %q, want %q", notifier.sent, want)
		}
	})

	t.Run("saves the order in the store it is given", func(t *testing.T) {
		orders := newFakeOrders()
		order := orderOf(grace, 5990)

		if _, err := checkout.New(orders, &fakeNotifier{}).PlaceOrder(order); err != nil {
			t.Fatal(err)
		}

		if saved, ok := orders.Find("order-1"); !ok || !reflect.DeepEqual(saved, order) {
			t.Errorf("saved %+v, %v, want %+v", saved, ok, order)
		}
	})

	t.Run("does not confirm an order that could not be saved", func(t *testing.T) {
		notifier := &fakeNotifier{}
		unavailable := newFakeOrders()
		unavailable.failure = errors.New("database unavailable")

		_, err := checkout.New(unavailable, notifier).PlaceOrder(orderOf(grace, 5990))

		if !errors.Is(err, unavailable.failure) {
			t.Errorf("error = %v, want %v", err, unavailable.failure)
		}
		if len(notifier.sent) != 0 {
			t.Errorf("sent = %q, want nothing", notifier.sent)
		}
	})
}
