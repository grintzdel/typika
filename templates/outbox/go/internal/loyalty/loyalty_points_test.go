package loyalty_test

import (
	"fmt"
	"testing"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/loyalty"
)

func orderPlaced(orderID string, totalCents int64) infra.Message {
	return infra.Message{
		Topic:   "OrderPlaced",
		Payload: fmt.Sprintf(`{"orderId":%q,"customerEmail":"ada@example.com","totalCents":%d}`, orderID, totalCents),
	}
}

func TestLoyaltyPoints(t *testing.T) {
	t.Run("awards one point per whole euro of each order", func(t *testing.T) {
		points := loyalty.NewLoyaltyPoints()

		points.Handle(orderPlaced("order-1", 3250))
		points.Handle(orderPlaced("order-2", 1000))

		if got := points.PointsOf("ada@example.com"); got != 42 {
			t.Errorf("points = %d, want 42", got)
		}
	})

	t.Run("awards the points of an order once, however many times it is delivered", func(t *testing.T) {
		points := loyalty.NewLoyaltyPoints()

		points.Handle(orderPlaced("order-1", 3250))
		points.Handle(orderPlaced("order-1", 3250))

		if got := points.PointsOf("ada@example.com"); got != 32 {
			t.Errorf("points = %d, want 32", got)
		}
	})
}
