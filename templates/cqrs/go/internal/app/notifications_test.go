package app_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/infra"
)

func lastEmail(shop app.Shop) infra.Email {
	if len(shop.Mailer.Sent) == 0 {
		return infra.Email{}
	}
	return shop.Mailer.Sent[len(shop.Mailer.Sent)-1]
}

func TestCustomerNotifications(t *testing.T) {
	t.Run("emails a confirmation with the order total", func(t *testing.T) {
		shop := app.OpenShop()

		placeOrder(shop, orderOf(ada, 3250))

		want := []infra.Email{{
			To:      "ada@example.com",
			Subject: "Order order-1 confirmed",
			Body:    "Hello Ada, we received your order of 32.50 EUR.",
		}}
		if !slices.Equal(shop.Mailer.Sent, want) {
			t.Errorf("sent %v, want %v", shop.Mailer.Sent, want)
		}
	})

	t.Run("emails the customer when the order ships", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})

		post(shop, "/orders/"+orderID+"/ship", nil)

		want := infra.Email{
			To:      "ada@example.com",
			Subject: "Order order-1 shipped",
			Body:    "Hello Ada, your order is on its way.",
		}
		if got := lastEmail(shop); got != want {
			t.Errorf("last email = %+v, want %+v", got, want)
		}
	})

	t.Run("emails the reason when the order is cancelled", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))

		post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "ordered twice"})

		want := infra.Email{
			To:      "ada@example.com",
			Subject: "Order order-1 cancelled",
			Body:    "Hello Ada, your order was cancelled: ordered twice.",
		}
		if got := lastEmail(shop); got != want {
			t.Errorf("last email = %+v, want %+v", got, want)
		}
	})
}
