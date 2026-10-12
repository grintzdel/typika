package payments

import "example.com/shop/internal/shop"

type Method string

const (
	Card         Method = "card"
	BankTransfer Method = "bank-transfer"
)

type Payment struct {
	ID     string
	Method Method
	Amount shop.Money
}

type CardToken string
