package app_test

import (
	"encoding/json"
	"slices"
	"testing"

	"example.com/shop/internal/app"
)

func publishedOrderIDs(shop app.Shop) []string {
	var orderIDs []string
	for _, message := range shop.Broker.Published {
		var payload struct {
			OrderID string `json:"orderId"`
		}
		if err := json.Unmarshal([]byte(message.Payload), &payload); err != nil {
			panic(err)
		}
		orderIDs = append(orderIDs, payload.OrderID)
	}
	return orderIDs
}

func TestBrokerOutage(t *testing.T) {
	t.Run("places and confirms the order while the broker is down", func(t *testing.T) {
		shop := app.OpenShop()
		shop.Broker.GoDown()

		orderID := placeOrder(shop, orderOf(ada, 3250))

		if status := field(get(shop, "/orders/"+orderID), "status"); status != "pending" {
			t.Errorf("order is %v, want pending", status)
		}
		if len(shop.Mailer.Sent) != 1 {
			t.Errorf("sent %d emails, want the confirmation", len(shop.Mailer.Sent))
		}
	})

	t.Run("publishes the missed event once the broker is back", func(t *testing.T) {
		shop := app.OpenShop()
		shop.Broker.GoDown()
		placeOrder(shop, orderOf(ada, 3250))

		shop.Broker.ComeBack()
		shop.Relay.PublishPending()

		want := `{"orderId":"order-1","customerEmail":"ada@example.com","totalCents":3250}`
		published := shop.Broker.Published
		if len(published) != 1 || published[0].Topic != "OrderPlaced" || !sameJSON(published[0].Payload, want) {
			t.Errorf("published %v, want OrderPlaced %s", published, want)
		}
	})

	t.Run("publishes missed events before new ones, and each one once", func(t *testing.T) {
		shop := app.OpenShop()
		shop.Broker.GoDown()
		placeOrder(shop, orderOf(ada, 3250))
		shop.Broker.ComeBack()

		placeOrder(shop, orderOf(grace, 1000))
		shop.Relay.PublishPending()

		if got, want := publishedOrderIDs(shop), []string{"order-1", "order-2"}; !slices.Equal(got, want) {
			t.Errorf("published orders %v, want %v", got, want)
		}
	})
}
