package app_test

import (
	"errors"
	"slices"
	"testing"

	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

const giftCard = payments.Method("gift-card")

func TestGiftCardPayment(t *testing.T) {
	t.Run("pays through the gift card partner", func(t *testing.T) {
		services := fakeServices()

		payment := pay(t, services.open(), giftCard, shop.EUR(2500))

		if want := []shop.Money{shop.EUR(2500)}; !slices.Equal(services.giftCards.redeemed, want) {
			t.Errorf("redeemed = %v, want %v", services.giftCards.redeemed, want)
		}
		if want := (payments.Payment{ID: "gift-1", Method: giftCard, Amount: shop.EUR(2500)}); payment != want {
			t.Errorf("payment = %+v, want %+v", payment, want)
		}
	})

	t.Run("records the payment in the ledger", func(t *testing.T) {
		services := fakeServices()

		pay(t, services.open(), giftCard, shop.EUR(2500))

		assertEntries(t, services.ledger, "gift card: redeemed 25.00 EUR")
	})

	t.Run("lets the partner refuse a payment", func(t *testing.T) {
		services := fakeServices()
		refusal := errors.New("gift card balance too low")
		services.giftCards.refusal = refusal

		_, err := services.open().Checkout.Pay(giftCard, shop.EUR(2500))

		if !errors.Is(err, refusal) {
			t.Errorf("error = %v, want %v", err, refusal)
		}
		assertEntries(t, services.ledger)
	})

	t.Run("refuses to refund a gift card payment", func(t *testing.T) {
		s := fakeServices().open()
		payment := pay(t, s, giftCard, shop.EUR(2500))

		err := s.Refunds.Refund(payment)

		if err == nil || err.Error() != "payments by gift-card cannot be refunded" {
			t.Errorf("error = %v, want payments by gift-card cannot be refunded", err)
		}
	})

	t.Run("keeps refunding card payments", func(t *testing.T) {
		services := fakeServices()
		s := services.open()

		refund(t, s, pay(t, s, payments.Card, shop.EUR(5990)))

		if entries := services.ledger.Entries(); !slices.Contains(entries, "card: refunded 59.90 EUR of card-1") {
			t.Errorf("ledger = %q, want it to contain the card refund", entries)
		}
	})
}
