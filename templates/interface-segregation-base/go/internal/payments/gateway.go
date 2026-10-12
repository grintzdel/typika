package payments

import "example.com/shop/internal/shop"

type PaymentGateway interface {
	Charge(amount shop.Money) (Payment, error)
	Refund(payment Payment) error
	SaveCard(customerEmail, cardNumber string) (CardToken, error)
	Subscribe(card CardToken, monthlyFee shop.Money) error
}
