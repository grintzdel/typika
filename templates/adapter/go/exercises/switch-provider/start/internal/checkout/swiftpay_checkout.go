package checkout

import (
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/swiftpay"
)

func OpenCheckoutWithSwiftPay(client *swiftpay.Client) Desk {
	return OpenCheckout(legacypay.NewClient())
}
