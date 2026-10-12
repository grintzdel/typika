package app_test

import (
	"testing"

	"example.com/shop/internal/app"
)

func TestCustomerOrderHistory(t *testing.T) {
	t.Run("counts the orders, sums what was spent and shows the last status", func(t *testing.T) {
		shop := app.OpenShop()
		first := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+first+"/pay", map[string]any{"cardToken": "tok_visa"})
		placeOrder(shop, orderOf(grace, 9900))
		second := placeOrder(shop, orderOf(ada, 1000))
		post(shop, "/orders/"+second+"/pay", map[string]any{"cardToken": "tok_visa"})

		history := get(shop, "/customers/ada@example.com/orders").Body

		if want := `{"lastStatus":"paid","orderCount":2,"totalSpentCents":4250}`; history != want {
			t.Errorf("history = %s, want %s", history, want)
		}
	})

	t.Run("leaves cancelled orders out of the amount spent", func(t *testing.T) {
		shop := app.OpenShop()
		placeOrder(shop, orderOf(ada, 3250))
		cancelled := placeOrder(shop, orderOf(ada, 1000))
		post(shop, "/orders/"+cancelled+"/cancel", map[string]any{"reason": "ordered twice"})

		history := get(shop, "/customers/ada@example.com/orders").Body

		if want := `{"lastStatus":"cancelled","orderCount":2,"totalSpentCents":3250}`; history != want {
			t.Errorf("history = %s, want %s", history, want)
		}
	})

	t.Run("shows an empty history for a customer without orders", func(t *testing.T) {
		history := get(app.OpenShop(), "/customers/ada@example.com/orders").Body

		if want := `{"lastStatus":null,"orderCount":0,"totalSpentCents":0}`; history != want {
			t.Errorf("history = %s, want %s", history, want)
		}
	})
}
