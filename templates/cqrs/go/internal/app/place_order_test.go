package app_test

import (
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/web"
)

func TestPlacingAnOrder(t *testing.T) {
	t.Run("saves a pending order and returns its id and total", func(t *testing.T) {
		shop := app.OpenShop()

		response := post(shop, "/orders", map[string]any{
			"customer": ada,
			"lines": []map[string]any{
				{"sku": "MUG-01", "unitPriceCents": 1200, "quantity": 2},
				{"sku": "TEA-GREEN", "unitPriceCents": 850, "quantity": 1},
			},
		})

		if want := (web.Response{Status: 201, Body: `{"orderId":"order-1","totalCents":3250}`}); response != want {
			t.Errorf("response = %+v, want %+v", response, want)
		}
		order := get(shop, "/orders/order-1").Body
		if want := `{"customerEmail":"ada@example.com","orderId":"order-1","status":"pending","totalCents":3250}`; order != want {
			t.Errorf("order = %s, want %s", order, want)
		}
	})

	t.Run("gives every order its own id", func(t *testing.T) {
		shop := app.OpenShop()

		first := placeOrder(shop, orderOf(ada, 1000))
		second := placeOrder(shop, orderOf(grace, 2000))

		if first != "order-1" || second != "order-2" {
			t.Errorf("ids = %s, %s, want order-1, order-2", first, second)
		}
	})

	t.Run("rejects an order without a valid customer email", func(t *testing.T) {
		response := post(app.OpenShop(), "/orders", orderOf(customer{Name: "Ada", Email: "ada"}, 1000))

		if response.Status != 400 {
			t.Errorf("status = %d, want 400", response.Status)
		}
	})

	t.Run("rejects an order without lines", func(t *testing.T) {
		response := post(app.OpenShop(), "/orders", map[string]any{"customer": ada, "lines": []any{}})

		if response.Status != 400 {
			t.Errorf("status = %d, want 400", response.Status)
		}
	})

	t.Run("rejects a line with a quantity that is not a positive whole number", func(t *testing.T) {
		response := post(app.OpenShop(), "/orders", map[string]any{
			"customer": ada,
			"lines":    []map[string]any{{"sku": "MUG-01", "unitPriceCents": 1200, "quantity": 0.5}},
		})

		if response.Status != 400 {
			t.Errorf("status = %d, want 400", response.Status)
		}
	})

	t.Run("saves, publishes and sends nothing for a rejected order", func(t *testing.T) {
		shop := app.OpenShop()

		post(shop, "/orders", map[string]any{"customer": ada, "lines": []any{}})

		if status := get(shop, "/orders/order-1").Status; status != 404 {
			t.Errorf("order-1 answers %d, want 404", status)
		}
		if len(shop.Broker.Published) != 0 || len(shop.Mailer.Sent) != 0 {
			t.Errorf("published %v and sent %v, want nothing", shop.Broker.Published, shop.Mailer.Sent)
		}
	})

	t.Run("finds nothing for an unknown order", func(t *testing.T) {
		if status := get(app.OpenShop(), "/orders/order-9").Status; status != 404 {
			t.Errorf("status = %d, want 404", status)
		}
	})
}
