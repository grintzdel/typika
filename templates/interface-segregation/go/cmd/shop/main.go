package main

import (
	"fmt"
	"log"

	"example.com/shop/internal/app"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

func main() {
	ledger := &shop.Ledger{}
	if err := run(app.OpenShop(app.Services{Ledger: ledger})); err != nil {
		log.Fatal(err)
	}
	for _, entry := range ledger.Entries() {
		fmt.Println(entry)
	}
}

func run(s app.Shop) error {
	if _, err := s.Checkout.Pay(payments.Card, shop.EUR(5990)); err != nil {
		return err
	}
	transfer, err := s.Checkout.Pay(payments.BankTransfer, shop.EUR(3250))
	if err != nil {
		return err
	}
	if err := s.Refunds.Refund(transfer); err != nil {
		return err
	}
	card, err := s.Wallet.SaveCard("grace@example.com", "4242424242424242")
	if err != nil {
		return err
	}
	return s.TeaClub.Join(card)
}
