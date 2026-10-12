package checkout_test

import (
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/shop"
)

func payWith(token string) checkout.PaymentOutcome {
	return checkout.OpenCheckout(legacypay.NewClient()).Checkout.Pay(order, shop.Card{Token: token})
}

func TestCheckout(t *testing.T) {
	t.Run("charges the order total in euros", func(t *testing.T) {
		client := legacypay.NewClient()

		outcome := checkout.OpenCheckout(client).Checkout.Pay(order, shop.Card{Token: "tok_visa"})

		if outcome.Status != checkout.Paid {
			t.Fatalf("outcome = %+v, want paid", outcome)
		}
		if code := client.ReversePayment(outcome.PaymentID, 3251).Code; code != legacypay.CodeInvalidAmount {
			t.Errorf("LegacyPay accepts a reversal of 32.51 (code %d): it holds more than the order total", code)
		}
		if code := client.ReversePayment(outcome.PaymentID, 3250).Code; code != legacypay.CodeApproved {
			t.Errorf("LegacyPay refuses a reversal of 32.50 (code %d): it holds less than the order total", code)
		}
	})

	tests := []struct {
		name  string
		token string
		want  checkout.PaymentOutcome
	}{
		{"pays with an accepted card", "tok_visa",
			checkout.PaymentOutcome{Status: checkout.Paid, PaymentID: "LP-1", Amount: shop.EUR(3250)}},
		{"declines a card without enough funds", "tok_no_funds",
			checkout.PaymentOutcome{Status: checkout.Declined, Message: "Your card was declined: insufficient funds."}},
		{"declines an expired card", "tok_expired",
			checkout.PaymentOutcome{Status: checkout.Declined, Message: "Your card has expired."}},
		{"declines a card the issuer refuses", "tok_refused",
			checkout.PaymentOutcome{Status: checkout.Declined, Message: "Your card was declined."}},
		{"asks to try again later when the card issuer is unavailable", "tok_issuer_down",
			checkout.PaymentOutcome{Status: checkout.RetryLater}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := payWith(tt.token); got != tt.want {
				t.Errorf("outcome = %+v, want %+v", got, tt.want)
			}
		})
	}
}
