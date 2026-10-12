package adapters

import (
	"encoding/json"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
)

var _ orders.EventPublisher = (*BrokerEventPublisher)(nil)

type BrokerEventPublisher struct {
	broker *infra.FakeBroker
}

func NewBrokerEventPublisher(broker *infra.FakeBroker) *BrokerEventPublisher {
	return &BrokerEventPublisher{broker: broker}
}

func payloadOf(event orders.Event) map[string]any {
	order := event.Order
	switch event.Type {
	case orders.OrderPlaced:
		return map[string]any{"orderId": order.ID, "customerEmail": order.Customer.Email, "totalCents": order.Total.Cents()}
	case orders.OrderPaid:
		return map[string]any{"orderId": order.ID, "totalCents": order.Total.Cents()}
	default:
		return map[string]any{"orderId": order.ID}
	}
}

func (p *BrokerEventPublisher) Publish(event orders.Event) error {
	payload, err := json.Marshal(payloadOf(event))
	if err != nil {
		return err
	}
	return p.broker.Publish(string(event.Type), payload)
}
