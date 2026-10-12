package app_test

import (
	"context"
	"encoding/json"
	"slices"
	"testing"
	"time"

	"example.com/shop/internal/app"
	"example.com/shop/internal/infra"
)

func orderIDOf(message infra.Message) string {
	var payload struct {
		OrderID string `json:"orderId"`
	}
	if err := json.Unmarshal([]byte(message.Payload), &payload); err != nil {
		panic(err)
	}
	return payload.OrderID
}

func TestOutboxRelay(t *testing.T) {
	t.Run("keeps the event while the broker is down and publishes it once it is back", func(t *testing.T) {
		shop := app.OpenShop()
		shop.Broker.GoDown()
		placeOrder(shop, orderOf(ada, 3250))

		if published := shop.Relay.PublishPending(); published != 0 {
			t.Errorf("published %d while the broker is down, want 0", published)
		}
		shop.Broker.ComeBack()

		if published := shop.Relay.PublishPending(); published != 1 {
			t.Errorf("published %d once the broker is back, want 1", published)
		}
		if published := shop.Relay.PublishPending(); published != 0 {
			t.Errorf("published %d on the next run, want 0", published)
		}
		if len(shop.Broker.Published) != 1 || shop.Broker.Published[0].Topic != "OrderPlaced" {
			t.Errorf("published %v, want one OrderPlaced", shop.Broker.Published)
		}
	})

	t.Run("publishes from a background loop until its context is cancelled", func(t *testing.T) {
		shop := app.OpenShop()
		shop.Broker.GoDown()
		placeOrder(shop, orderOf(ada, 3250))
		placeOrder(shop, orderOf(grace, 1000))
		shop.Broker.ComeBack()

		ctx, cancel := context.WithCancel(context.Background())
		done := make(chan struct{})
		go func() {
			shop.Relay.Run(ctx, time.Millisecond)
			close(done)
		}()
		for deadline := time.Now().Add(time.Second); shop.Relay.Pending() > 0 && time.Now().Before(deadline); {
			time.Sleep(time.Millisecond)
		}
		cancel()
		<-done

		var orderIDs []string
		for _, message := range shop.Broker.Published {
			orderIDs = append(orderIDs, orderIDOf(message))
		}
		if want := []string{"order-1", "order-2"}; !slices.Equal(orderIDs, want) {
			t.Errorf("published orders %v, want %v", orderIDs, want)
		}
	})
}
