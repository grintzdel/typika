package main

import (
	"fmt"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/shop"
)

var order = shop.Order{
	Customer: shop.Customer{Name: "Ada", Tier: shop.Regular},
	Lines: []shop.OrderLine{
		{SKU: "MUG-01", UnitPrice: shop.EUR(1200), Quantity: 2},
		{SKU: "TEA-GREEN", UnitPrice: shop.EUR(850), Quantity: 1},
	},
}

func main() {
	desk := checkout.OpenCheckout(legacypay.NewClient())

	fmt.Printf("Ada checks out %s\n", order.Total())
	for _, token := range []string{"tok_no_funds", "tok_expired", "tok_issuer_down", "tok_visa"} {
		outcome := desk.Checkout.Pay(order, shop.Card{Token: token})
		fmt.Printf("  %-16s %s %s%s\n", token, outcome.Status, outcome.Message, outcome.PaymentID)

		if outcome.Status == checkout.Paid {
			fmt.Println("Ada cancels the order")
			status := desk.Cancellation.Cancel(outcome.PaymentID, outcome.Amount)
			fmt.Printf("  refund %s  %s\n", outcome.PaymentID, status)
		}
	}
}
