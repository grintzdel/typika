package app

import (
	"example.com/shop/internal/checkout"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
	"example.com/shop/internal/teaclub"
	"example.com/shop/internal/wallet"
)

type Services struct {
	Ledger    *shop.Ledger
	GiftCards payments.GiftCards
}

type Shop struct {
	Checkout *checkout.Checkout
	Refunds  *checkout.Refunds
	Wallet   *wallet.Wallet
	TeaClub  *teaclub.TeaClub
}

// #region tour:compose
func OpenShop(services Services) Shop {
	card := payments.NewCardGateway(services.Ledger)
	bankTransfer := payments.NewBankTransferGateway(services.Ledger)
	giftCard := payments.NewGiftCardGateway(services.GiftCards, services.Ledger)

	return Shop{
		Checkout: checkout.New(map[payments.Method]checkout.Charger{
			payments.Card:         card,
			payments.BankTransfer: bankTransfer,
			payments.GiftCard:     giftCard,
		}),
		Refunds: checkout.NewRefunds(map[payments.Method]checkout.Refunder{
			payments.Card:         card,
			payments.BankTransfer: bankTransfer,
		}),
		Wallet:  wallet.New(card),
		TeaClub: teaclub.New(card),
	}
}

// #endregion
