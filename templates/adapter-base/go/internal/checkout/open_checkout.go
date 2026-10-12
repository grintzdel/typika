package checkout

import "example.com/shop/internal/legacypay"

type Desk struct {
	Checkout     *Checkout
	Cancellation *Cancellation
}

func OpenCheckout(client *legacypay.Client) Desk {
	return Desk{Checkout: &Checkout{client: client}, Cancellation: &Cancellation{client: client}}
}
