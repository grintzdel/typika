package checkout

import (
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/payments"
)

type Desk struct {
	Checkout     *Checkout
	Cancellation *Cancellation
}

func OpenCheckout(client *legacypay.Client) Desk {
	gateway := payments.NewLegacyPayAdapter(client)
	return Desk{Checkout: &Checkout{payments: gateway}, Cancellation: &Cancellation{payments: gateway}}
}
