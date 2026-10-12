package adapters

import (
	"fmt"

	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
	"example.com/shop/internal/shop"
)

var _ orders.PaymentGateway = (*CardPaymentGateway)(nil)

type CardPaymentGateway struct {
	cards *infra.CardProcessor
}

func NewCardPaymentGateway(cards *infra.CardProcessor) *CardPaymentGateway {
	return &CardPaymentGateway{cards: cards}
}

func (g *CardPaymentGateway) Charge(amount shop.Money, cardToken string) (string, error) {
	charge := g.cards.Charge(cardToken, amount.Cents())
	if !charge.Approved {
		return "", fmt.Errorf("%w: %s", orders.ErrPaymentDeclined, charge.Reason)
	}
	return charge.ChargeID, nil
}

func (g *CardPaymentGateway) Refund(paymentID string) {
	g.cards.Refund(paymentID)
}
