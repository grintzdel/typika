package app_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/web"
)

func statusOf(shop app.Shop, orderID string) any {
	return field(get(shop, "/orders/"+orderID), "status")
}

func TestOrderLifecycle(t *testing.T) {
	t.Run("pays an order with an accepted card", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))

		response := post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})

		if want := (web.Response{Status: 200, Body: `{"orderId":"order-1","status":"paid"}`}); response != want {
			t.Errorf("response = %+v, want %+v", response, want)
		}
	})

	t.Run("keeps the order pending when the card is declined", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))

		response := post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_refused"})

		if response.Status != 402 {
			t.Errorf("status = %d, want 402", response.Status)
		}
		if status := statusOf(shop, orderID); status != "pending" {
			t.Errorf("order is %v, want pending", status)
		}
	})

	t.Run("refuses to ship an order that is not paid", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))

		if status := post(shop, "/orders/"+orderID+"/ship", nil).Status; status != 409 {
			t.Errorf("status = %d, want 409", status)
		}
		if status := statusOf(shop, orderID); status != "pending" {
			t.Errorf("order is %v, want pending", status)
		}
	})

	t.Run("ships then delivers a paid order", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})

		if status := field(post(shop, "/orders/"+orderID+"/ship", nil), "status"); status != "shipped" {
			t.Errorf("after ship, order is %v, want shipped", status)
		}
		if status := field(post(shop, "/orders/"+orderID+"/deliver", nil), "status"); status != "delivered" {
			t.Errorf("after deliver, order is %v, want delivered", status)
		}
	})

	t.Run("cancels a pending order without refunding anything", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))

		response := post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "ordered twice"})

		if status := field(response, "status"); status != "cancelled" {
			t.Errorf("order is %v, want cancelled", status)
		}
		if len(shop.Cards.Refunded) != 0 {
			t.Errorf("refunded %v, want nothing", shop.Cards.Refunded)
		}
	})

	t.Run("refunds a paid order when it is cancelled", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})

		post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "ordered twice"})

		if want := []string{"ch_1"}; !slices.Equal(shop.Cards.Refunded, want) {
			t.Errorf("refunded %v, want %v", shop.Cards.Refunded, want)
		}
	})

	t.Run("refuses to cancel an order that has shipped", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})
		post(shop, "/orders/"+orderID+"/ship", nil)

		response := post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "too late"})

		if response.Status != 409 {
			t.Errorf("status = %d, want 409", response.Status)
		}
		if status := statusOf(shop, orderID); status != "shipped" {
			t.Errorf("order is %v, want shipped", status)
		}
	})

	t.Run("refuses to pay a cancelled order", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "ordered twice"})

		response := post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})

		if response.Status != 409 {
			t.Errorf("status = %d, want 409", response.Status)
		}
	})

	t.Run("answers 404 for an unknown order", func(t *testing.T) {
		response := post(app.OpenShop(), "/orders/order-9/pay", map[string]any{"cardToken": "tok_visa"})

		if response.Status != 404 {
			t.Errorf("status = %d, want 404", response.Status)
		}
	})
}
