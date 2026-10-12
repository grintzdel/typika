package payments

import (
	"fmt"

	"example.com/shop/internal/shop"
)

type GiftCardGateway struct {
	giftCards GiftCards
	ledger    *shop.Ledger
}

func NewGiftCardGateway(giftCards GiftCards, ledger *shop.Ledger) *GiftCardGateway {
	return &GiftCardGateway{giftCards: giftCards, ledger: ledger}
}

func (g *GiftCardGateway) Charge(amount shop.Money) (Payment, error) {
	id, err := g.giftCards.Redeem(amount)
	if err != nil {
		return Payment{}, err
	}
	g.ledger.Record(fmt.Sprintf("gift card: redeemed %s", amount))
	return Payment{ID: id, Method: GiftCard, Amount: amount}, nil
}
