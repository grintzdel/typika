package checkout_test

import (
	"errors"
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/shop"
	"example.com/shop/internal/swiftpay"
)

func refundOnSwiftPay(client *swiftpay.Client, charge, value string) error {
	return client.CreateRefund(swiftpay.RefundParams{Charge: charge, Amount: swiftpay.Amount{Value: value, Currency: "EUR"}})
}

func TestCheckoutWithSwiftPay(t *testing.T) {
	t.Run("charges the order total as a decimal amount in euros", func(t *testing.T) {
		client := swiftpay.NewClient()

		outcome := checkout.OpenCheckoutWithSwiftPay(client).Checkout.Pay(order, shop.Card{Token: "src_visa"})

		if outcome.Status != checkout.Paid {
			t.Fatalf("outcome = %+v, want paid", outcome)
		}
		if err := refundOnSwiftPay(client, outcome.PaymentID, "32.51"); err == nil {
			t.Error("SwiftPay accepts a refund of 32.51: it holds more than the order total")
		}
		if err := refundOnSwiftPay(client, outcome.PaymentID, "32.50"); err != nil {
			t.Errorf("SwiftPay refuses a refund of 32.50 (%v): it holds less than the order total", err)
		}
	})

	tests := []struct {
		name   string
		source string
		want   checkout.PaymentOutcome
	}{
		{"pays with an accepted card", "src_visa",
			checkout.PaymentOutcome{Status: checkout.Paid, PaymentID: "sp_ch_1", Amount: shop.EUR(3250)}},
		{"declines a card without enough funds", "src_no_funds",
			checkout.PaymentOutcome{Status: checkout.Declined, Message: "Your card was declined: insufficient funds."}},
		{"declines an expired card", "src_expired",
			checkout.PaymentOutcome{Status: checkout.Declined, Message: "Your card has expired."}},
		{"declines a card the bank refuses", "src_declined",
			checkout.PaymentOutcome{Status: checkout.Declined, Message: "Your card was declined."}},
		{"asks to try again later when SwiftPay is busy", "src_busy",
			checkout.PaymentOutcome{Status: checkout.RetryLater}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			desk := checkout.OpenCheckoutWithSwiftPay(swiftpay.NewClient())
			if got := desk.Checkout.Pay(order, shop.Card{Token: tt.source}); got != tt.want {
				t.Errorf("outcome = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestCancellationWithSwiftPay(t *testing.T) {
	t.Run("refunds a paid order through SwiftPay", func(t *testing.T) {
		client := swiftpay.NewClient()
		desk := checkout.OpenCheckoutWithSwiftPay(client)
		payment := paidOrder(t, desk)

		if got := desk.Cancellation.Cancel(payment.PaymentID, payment.Amount); got != checkout.Refunded {
			t.Errorf("status = %s, want refunded", got)
		}
		var swiftPayErr *swiftpay.Error
		err := refundOnSwiftPay(client, payment.PaymentID, "0.01")
		if !errors.As(err, &swiftPayErr) || swiftPayErr.Code != swiftpay.AmountTooLarge {
			t.Errorf("refunding 0.01 more = %v, want amount_too_large: SwiftPay did not refund the payment", err)
		}
	})

	t.Run("reports a refund for an unknown payment as failed", func(t *testing.T) {
		desk := checkout.OpenCheckoutWithSwiftPay(swiftpay.NewClient())

		if got := desk.Cancellation.Cancel("sp_ch_404", shop.EUR(3250)); got != checkout.RefundFailed {
			t.Errorf("status = %s, want refund-failed", got)
		}
	})
}
