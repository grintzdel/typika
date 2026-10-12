package payments

import (
	"fmt"

	"example.com/shop/internal/shop"
)

type BankTransferGateway struct {
	ledger   *shop.Ledger
	payments int
}

func NewBankTransferGateway(ledger *shop.Ledger) *BankTransferGateway {
	return &BankTransferGateway{ledger: ledger}
}

func (g *BankTransferGateway) Charge(amount shop.Money) (Payment, error) {
	g.payments++
	g.ledger.Record(fmt.Sprintf("bank transfer: requested %s", amount))
	return Payment{ID: fmt.Sprintf("transfer-%d", g.payments), Method: BankTransfer, Amount: amount}, nil
}

func (g *BankTransferGateway) Refund(payment Payment) error {
	g.ledger.Record(fmt.Sprintf("bank transfer: sent back %s of %s", payment.Amount, payment.ID))
	return nil
}
