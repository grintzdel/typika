package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
)

func TestService(t *testing.T) {
	t.Run("works with any notifier it is given", func(t *testing.T) {
		notifier := &fakeNotifier{}

		if _, err := checkout.New(newFakeOrders(), notifier).PlaceOrder(orderOf(grace, 5990)); err != nil {
			t.Fatal(err)
		}

		if len(notifier.sent) != 1 {
			t.Errorf("sent %d notifications, want 1", len(notifier.sent))
		}
	})
}
