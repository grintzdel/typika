package infra

import "fmt"

type Charge struct {
	Approved bool
	ChargeID string
	Reason   string
}

var declinedCards = map[string]string{
	"tok_refused":  "Card refused",
	"tok_no_funds": "Insufficient funds",
}

type CardProcessor struct {
	Refunded []string
	charges  int
}

func NewCardProcessor() *CardProcessor {
	return &CardProcessor{}
}

func (p *CardProcessor) Charge(cardToken string, amountCents int64) Charge {
	if reason, declined := declinedCards[cardToken]; declined {
		return Charge{Reason: reason}
	}
	p.charges++
	fmt.Printf("card %s charged %d cents\n", cardToken, amountCents)
	return Charge{Approved: true, ChargeID: fmt.Sprintf("ch_%d", p.charges)}
}

func (p *CardProcessor) Refund(chargeID string) {
	p.Refunded = append(p.Refunded, chargeID)
}
