package main

import (
	"log"

	"example.com/shop/internal/app"
	"example.com/shop/internal/shop"
)

var orders = []shop.Order{
	{
		Customer: shop.Customer{Name: "Ada", Email: "ada@example.com", Tier: shop.Regular},
		Lines: []shop.OrderLine{
			{SKU: "MUG-01", UnitPrice: shop.EUR(1200), Quantity: 2},
			{SKU: "TEA-GREEN", UnitPrice: shop.EUR(850), Quantity: 1},
		},
	},
	{
		Customer: shop.Customer{Name: "Grace", Email: "grace@example.com", Tier: shop.Member},
		Lines:    []shop.OrderLine{{SKU: "KETTLE-01", UnitPrice: shop.EUR(5990), Quantity: 1}},
	},
}

func main() {
	s := app.OpenShop()
	for _, order := range orders {
		if _, err := s.Checkout.PlaceOrder(order); err != nil {
			log.Fatal(err)
		}
	}
}
