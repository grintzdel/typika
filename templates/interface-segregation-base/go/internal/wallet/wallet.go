package wallet

import "example.com/shop/internal/payments"

type Wallet struct {
	gateway payments.PaymentGateway
}

func New(gateway payments.PaymentGateway) *Wallet {
	return &Wallet{gateway: gateway}
}

func (w *Wallet) SaveCard(customerEmail, cardNumber string) (payments.CardToken, error) {
	return w.gateway.SaveCard(customerEmail, cardNumber)
}
