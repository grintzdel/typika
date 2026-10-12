package checkout

import (
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/swiftpay"
)

type Desk struct {
	Checkout     *Checkout
	Cancellation *Cancellation
}

func deskFor(gateway payments.Gateway) Desk {
	return Desk{Checkout: &Checkout{payments: gateway}, Cancellation: &Cancellation{payments: gateway}}
}

func OpenCheckout(client *legacypay.Client) Desk {
	return deskFor(payments.NewLegacyPayAdapter(client))
}

func OpenCheckoutWithSwiftPay(client *swiftpay.Client) Desk {
	return deskFor(payments.NewSwiftPayAdapter(client))
}
