package payments

import (
	"fmt"

	"example.com/shop/internal/shop"
)

type CardGateway struct {
	ledger   *shop.Ledger
	payments int
}

func NewCardGateway(ledger *shop.Ledger) *CardGateway {
	return &CardGateway{ledger: ledger}
}

func (g *CardGateway) Charge(amount shop.Money) (Payment, error) {
	g.payments++
	g.ledger.Record(fmt.Sprintf("card: charged %s", amount))
	return Payment{ID: fmt.Sprintf("card-%d", g.payments), Method: Card, Amount: amount}, nil
}

func (g *CardGateway) Refund(payment Payment) error {
	g.ledger.Record(fmt.Sprintf("card: refunded %s of %s", payment.Amount, payment.ID))
	return nil
}

func (g *CardGateway) SaveCard(customerEmail, cardNumber string) (CardToken, error) {
	token := CardToken("tok-" + cardNumber[max(0, len(cardNumber)-4):])
	g.ledger.Record(fmt.Sprintf("card: saved %s for %s", token, customerEmail))
	return token, nil
}

func (g *CardGateway) Subscribe(card CardToken, monthlyFee shop.Money) error {
	g.ledger.Record(fmt.Sprintf("card: subscribed %s to %s a month", card, monthlyFee))
	return nil
}
