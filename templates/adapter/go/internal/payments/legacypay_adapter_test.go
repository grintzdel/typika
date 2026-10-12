package payments_test

import (
	"errors"
	"testing"

	"example.com/shop/internal/legacypay"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

func TestLegacyPayAdapter(t *testing.T) {
	visa := shop.Card{Token: "tok_visa"}

	t.Run("sends the amount in cents and the currency as its ISO numeric code", func(t *testing.T) {
		client := legacypay.NewClient()

		result := payments.NewLegacyPayAdapter(client).Charge(shop.EUR(1999), visa)

		if result.Status != payments.Approved {
			t.Fatalf("result = %+v, want approved", result)
		}
		if code := client.ReversePayment(result.PaymentID, 1999).Code; code != legacypay.CodeApproved {
			t.Errorf("LegacyPay does not hold 1999 cents for the payment (code %d)", code)
		}
	})

	t.Run("turns an approval into an approved charge with the payment reference", func(t *testing.T) {
		got := payments.NewLegacyPayAdapter(legacypay.NewClient()).Charge(shop.EUR(1999), visa)

		if want := (payments.ChargeResult{Status: payments.Approved, PaymentID: "LP-1"}); got != want {
			t.Errorf("result = %+v, want %+v", got, want)
		}
	})

	t.Run("declines a charge on a code it does not know", func(t *testing.T) {
		got := payments.NewLegacyPayAdapter(legacypay.NewClient()).Charge(shop.EUR(1999), shop.Card{Token: "tok_fraud"})

		if want := (payments.ChargeResult{Status: payments.Declined, Reason: payments.Refused}); got != want {
			t.Errorf("result = %+v, want %+v", got, want)
		}
	})

	t.Run("turns an approved reversal into a refund", func(t *testing.T) {
		adapter := payments.NewLegacyPayAdapter(legacypay.NewClient())
		adapter.Charge(shop.EUR(1999), visa)

		if err := adapter.Refund("LP-1", shop.EUR(1999)); err != nil {
			t.Errorf("refund error = %v, want none", err)
		}
	})

	t.Run("turns a refused reversal into ErrRefundRejected", func(t *testing.T) {
		err := payments.NewLegacyPayAdapter(legacypay.NewClient()).Refund("LP-404", shop.EUR(1999))

		if !errors.Is(err, payments.ErrRefundRejected) {
			t.Errorf("refund error = %v, want ErrRefundRejected", err)
		}
	})
}
