package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/shop"
)

func paidOrder(t *testing.T, desk checkout.Desk) checkout.PaymentOutcome {
	t.Helper()
	payment := desk.Checkout.Pay(order, shop.Card{Token: "tok_visa"})
	if payment.Status != checkout.Paid {
		t.Fatalf("payment = %+v, want the test order paid", payment)
	}
	return payment
}

func TestCancellation(t *testing.T) {
	t.Run("refunds a paid order", func(t *testing.T) {
		desk := checkout.OpenCheckout(legacypay.NewClient())
		payment := paidOrder(t, desk)

		if got := desk.Cancellation.Cancel(payment.PaymentID, payment.Amount); got != checkout.Refunded {
			t.Errorf("status = %s, want refunded", got)
		}
	})

	t.Run("reports a refund for an unknown payment as failed", func(t *testing.T) {
		desk := checkout.OpenCheckout(legacypay.NewClient())

		if got := desk.Cancellation.Cancel("LP-404", shop.EUR(3250)); got != checkout.RefundFailed {
			t.Errorf("status = %s, want refund-failed", got)
		}
	})

	t.Run("reports a refund larger than the payment as failed", func(t *testing.T) {
		desk := checkout.OpenCheckout(legacypay.NewClient())
		payment := paidOrder(t, desk)

		if got := desk.Cancellation.Cancel(payment.PaymentID, shop.EUR(9999)); got != checkout.RefundFailed {
			t.Errorf("status = %s, want refund-failed", got)
		}
	})
}
