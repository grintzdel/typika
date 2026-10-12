package main

import (
	"fmt"

	"example.com/shop/internal/app"
	"example.com/shop/internal/web"
)

func main() {
	shop := app.OpenShop()

	call := func(method, path, body string) {
		response := shop.HTTP.Handle(web.Request{Method: method, Path: path, Body: body})
		fmt.Printf("%s %s -> %d %s\n", method, path, response.Status, response.Body)
	}

	call("POST", "/orders", `{
		"customer": {"name": "Ada", "email": "ada@example.com"},
		"lines": [
			{"sku": "MUG-01", "unitPriceCents": 1200, "quantity": 2},
			{"sku": "TEA-GREEN", "unitPriceCents": 850, "quantity": 1}
		]
	}`)
	call("POST", "/orders/order-1/pay", `{"cardToken": "tok_visa"}`)
	call("POST", "/orders/order-1/ship", "")
	call("POST", "/orders", `{
		"customer": {"name": "Ada", "email": "ada@example.com"},
		"lines": [{"sku": "KETTLE-01", "unitPriceCents": 5990, "quantity": 1}]
	}`)
	call("POST", "/orders/order-2/cancel", `{"reason": "ordered twice"}`)
	call("GET", "/customers/ada@example.com/orders", "")
}
