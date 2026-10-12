package loyalty

import (
	"encoding/json"

	"example.com/shop/internal/infra"
)

type LoyaltyPoints struct {
	points map[string]int64
}

func NewLoyaltyPoints() *LoyaltyPoints {
	return &LoyaltyPoints{points: map[string]int64{}}
}

// #region tour:consumer
func (l *LoyaltyPoints) Handle(message infra.Message) {
	if message.Topic != "OrderPlaced" {
		return
	}
	var payload struct {
		OrderID       string `json:"orderId"`
		CustomerEmail string `json:"customerEmail"`
		TotalCents    int64  `json:"totalCents"`
	}
	if err := json.Unmarshal([]byte(message.Payload), &payload); err != nil {
		return
	}
	l.points[payload.CustomerEmail] += payload.TotalCents / 100
}

// #endregion

func (l *LoyaltyPoints) PointsOf(customerEmail string) int64 {
	return l.points[customerEmail]
}
