package app_test

import (
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/web"
)

func dailyRevenue(shop app.Shop) web.Response {
	return get(shop, "/revenue/daily")
}

func TestDailyRevenueDashboard(t *testing.T) {
	t.Run("adds each payment to the day it was paid, not the day it was placed", func(t *testing.T) {
		shop := app.OpenShop()
		first := placeOrder(shop, orderOf(ada, 3250))
		shop.Clock.AdvanceDays(1)
		post(shop, "/orders/"+first+"/pay", map[string]any{"cardToken": "tok_visa"})
		second := placeOrder(shop, orderOf(grace, 1000))
		post(shop, "/orders/"+second+"/pay", map[string]any{"cardToken": "tok_visa"})
		placeOrder(shop, orderOf(ada, 500))

		response := dailyRevenue(shop)

		want := `{"days":[{"day":"2026-10-02","salesCents":4250,"refundsCents":0}]}`
		if response.Status != 200 || !sameJSON(response.Body, want) {
			t.Errorf("response = %d %s, want 200 %s", response.Status, response.Body, want)
		}
	})

	t.Run("counts a refund on the day the paid order is cancelled", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/pay", map[string]any{"cardToken": "tok_visa"})
		shop.Clock.AdvanceDays(2)
		post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "changed my mind"})

		body := dailyRevenue(shop).Body

		want := `{"days":[
			{"day":"2026-10-01","salesCents":3250,"refundsCents":0},
			{"day":"2026-10-03","salesCents":0,"refundsCents":3250}
		]}`
		if !sameJSON(body, want) {
			t.Errorf("body = %s, want %s", body, want)
		}
	})

	t.Run("shows nothing for an order cancelled before it was paid", func(t *testing.T) {
		shop := app.OpenShop()
		orderID := placeOrder(shop, orderOf(ada, 3250))
		post(shop, "/orders/"+orderID+"/cancel", map[string]any{"reason": "ordered twice"})

		if body := dailyRevenue(shop).Body; !sameJSON(body, `{"days":[]}`) {
			t.Errorf("body = %s, want no days", body)
		}
	})
}
