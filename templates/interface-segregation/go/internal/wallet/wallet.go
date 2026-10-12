package wallet

import "example.com/shop/internal/payments"

type CardSaver interface {
	SaveCard(customerEmail, cardNumber string) (payments.CardToken, error)
}

type Wallet struct {
	vault CardSaver
}

func New(vault CardSaver) *Wallet {
	return &Wallet{vault: vault}
}

func (w *Wallet) SaveCard(customerEmail, cardNumber string) (payments.CardToken, error) {
	return w.vault.SaveCard(customerEmail, cardNumber)
}
