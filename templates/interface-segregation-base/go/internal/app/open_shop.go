package app

import (
	"example.com/shop/internal/checkout"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
	"example.com/shop/internal/teaclub"
	"example.com/shop/internal/wallet"
)

type Services struct {
	Ledger *shop.Ledger
}

type Shop struct {
	Checkout *checkout.Checkout
	Refunds  *checkout.Refunds
	Wallet   *wallet.Wallet
	TeaClub  *teaclub.TeaClub
}

func OpenShop(services Services) Shop {
	card := payments.NewCardGateway(services.Ledger)
	bankTransfer := payments.NewBankTransferGateway(services.Ledger)
	gateways := map[payments.Method]payments.PaymentGateway{
		payments.Card:         card,
		payments.BankTransfer: bankTransfer,
	}

	return Shop{
		Checkout: checkout.New(gateways),
		Refunds:  checkout.NewRefunds(gateways),
		Wallet:   wallet.New(card),
		TeaClub:  teaclub.New(card),
	}
}
