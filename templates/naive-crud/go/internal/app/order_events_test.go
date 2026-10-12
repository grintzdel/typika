package app_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/infra"
)

func TestOrderEvents(t *testing.T) {
	t.Run("publishes OrderPlaced with the order total", func(t *testing.T) {
		shop := app.OpenShop()

		placeOrder(shop, orderOf(ada, 3250))

		want := []infra.Message{{
			Topic:   "OrderPlaced",
			Payload: `{"customerEmail":"ada@example.com","orderId":"order-1","totalCents":3250}`,
		}}
		if !slices.Equal(shop.Broker.Published, want) {
			t.Errorf("published %v, want %v", shop.Broker.Published, want)
		}
	})

	t.Run("publishes an event for each step of the order", func(t *testing.T) {
		shop := app.OpenShop()
		delivered := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+delivered+"/pay", map[string]any{"cardToken": "tok_visa"})
		post(shop, "/orders/"+delivered+"/ship", nil)
		post(shop, "/orders/"+delivered+"/deliver", nil)
		cancelled := placeOrder(shop, orderOf(ada, 1000))
		post(shop, "/orders/"+cancelled+"/cancel", map[string]any{"reason": "ordered twice"})

		var topics []string
		for _, message := range shop.Broker.Published {
			topics = append(topics, message.Topic)
		}
		want := []string{"OrderPlaced", "OrderPaid", "OrderShipped", "OrderDelivered", "OrderPlaced", "OrderCancelled"}
		if !slices.Equal(topics, want) {
			t.Errorf("topics = %v, want %v", topics, want)
		}
	})
}
