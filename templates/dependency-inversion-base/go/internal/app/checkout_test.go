package app_test

import (
	"reflect"
	"testing"

	"example.com/shop/internal/app"
)

func TestCheckout(t *testing.T) {
	t.Run("gives every order its own id", func(t *testing.T) {
		checkout := app.OpenShop().Checkout

		first, err := checkout.PlaceOrder(orderOf(ada, 1000))
		if err != nil {
			t.Fatal(err)
		}
		second, err := checkout.PlaceOrder(orderOf(grace, 2000))
		if err != nil {
			t.Fatal(err)
		}

		if first != "order-1" || second != "order-2" {
			t.Errorf("ids = %q, %q, want order-1, order-2", first, second)
		}
	})

	t.Run("finds a placed order by its id", func(t *testing.T) {
		checkout := app.OpenShop().Checkout
		order := orderOf(grace, 5990)

		orderID, err := checkout.PlaceOrder(order)
		if err != nil {
			t.Fatal(err)
		}

		if found, ok := checkout.FindOrder(orderID); !ok || !reflect.DeepEqual(found, order) {
			t.Errorf("found %+v, %v, want %+v", found, ok, order)
		}
	})

	t.Run("finds nothing for an unknown id", func(t *testing.T) {
		if _, ok := app.OpenShop().Checkout.FindOrder("order-9"); ok {
			t.Error("found an order for order-9, want none")
		}
	})
}
