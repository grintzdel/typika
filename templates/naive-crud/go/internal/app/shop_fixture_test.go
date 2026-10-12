package app_test

import (
	"encoding/json"
	"fmt"

	"example.com/shop/internal/app"
	"example.com/shop/internal/web"
)

type customer struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

var (
	ada   = customer{Name: "Ada", Email: "ada@example.com"}
	grace = customer{Name: "Grace", Email: "grace@example.com"}
)

func orderOf(c customer, totalCents int64) map[string]any {
	return map[string]any{
		"customer": c,
		"lines":    []map[string]any{{"sku": "TEST-SKU", "unitPriceCents": totalCents, "quantity": 1}},
	}
}

func post(shop app.Shop, path string, body any) web.Response {
	request := web.Request{Method: "POST", Path: path}
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			panic(err)
		}
		request.Body = string(data)
	}
	return shop.HTTP.Handle(request)
}

func get(shop app.Shop, path string) web.Response {
	return shop.HTTP.Handle(web.Request{Method: "GET", Path: path})
}

func field(response web.Response, name string) any {
	var body map[string]any
	if err := json.Unmarshal([]byte(response.Body), &body); err != nil {
		panic(err)
	}
	return body[name]
}

func placeOrder(shop app.Shop, body any) string {
	return fmt.Sprint(field(post(shop, "/orders", body), "orderId"))
}
