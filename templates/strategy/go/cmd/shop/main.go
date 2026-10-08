package main

import (
	"fmt"
	"log"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
)

var orders = []shop.Order{
	{
		Customer: shop.Customer{Name: "Ada", Tier: shop.Regular},
		Lines: []shop.OrderLine{
			{SKU: "MUG-01", UnitPrice: shop.EUR(1200), Quantity: 2, UnitWeightGrams: 400},
			{SKU: "TEA-GREEN", UnitPrice: shop.EUR(850), Quantity: 1, UnitWeightGrams: 250},
		},
	},
	{
		Customer: shop.Customer{Name: "Grace", Tier: shop.Member},
		Lines: []shop.OrderLine{
			{SKU: "KETTLE-01", UnitPrice: shop.EUR(5900), Quantity: 1, UnitWeightGrams: 2400},
		},
	},
}

func main() {
	for _, order := range orders {
		weightKg := float64(order.WeightGrams()) / 1000
		fmt.Printf("%s (%s): %.1f kg, subtotal %s\n", order.Customer.Name, order.Customer.Tier, weightKg, order.Subtotal())
		for _, option := range checkout.ShippingOptions {
			quote, err := checkout.QuoteShipping(order, option)
			if err != nil {
				log.Fatal(err)
			}
			fmt.Printf("  %-12s shipping %10s   total %10s\n", option, quote.Shipping, quote.Total)
		}
	}
}
