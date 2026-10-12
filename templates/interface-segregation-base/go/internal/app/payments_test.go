package app_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/app"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

func pay(t *testing.T, s app.Shop, method payments.Method, amount shop.Money) payments.Payment {
	t.Helper()
	payment, err := s.Checkout.Pay(method, amount)
	if err != nil {
		t.Fatal(err)
	}
	return payment
}

func refund(t *testing.T, s app.Shop, payment payments.Payment) {
	t.Helper()
	if err := s.Refunds.Refund(payment); err != nil {
		t.Fatal(err)
	}
}

func assertEntries(t *testing.T, ledger *shop.Ledger, want ...string) {
	t.Helper()
	if got := ledger.Entries(); !slices.Equal(got, want) {
		t.Errorf("ledger = %q, want %q", got, want)
	}
}

func TestPayments(t *testing.T) {
	t.Run("charges a card", func(t *testing.T) {
		services := fakeServices()

		payment := pay(t, services.open(), payments.Card, shop.EUR(5990))

		if want := (payments.Payment{ID: "card-1", Method: payments.Card, Amount: shop.EUR(5990)}); payment != want {
			t.Errorf("payment = %+v, want %+v", payment, want)
		}
		assertEntries(t, services.ledger, "card: charged 59.90 EUR")
	})

	t.Run("requests a bank transfer", func(t *testing.T) {
		services := fakeServices()

		payment := pay(t, services.open(), payments.BankTransfer, shop.EUR(3250))

		want := payments.Payment{ID: "transfer-1", Method: payments.BankTransfer, Amount: shop.EUR(3250)}
		if payment != want {
			t.Errorf("payment = %+v, want %+v", payment, want)
		}
		assertEntries(t, services.ledger, "bank transfer: requested 32.50 EUR")
	})

	t.Run("refunds a payment through the method that took it", func(t *testing.T) {
		services := fakeServices()
		s := services.open()

		refund(t, s, pay(t, s, payments.Card, shop.EUR(5990)))
		refund(t, s, pay(t, s, payments.BankTransfer, shop.EUR(3250)))

		assertEntries(t, services.ledger,
			"card: charged 59.90 EUR",
			"card: refunded 59.90 EUR of card-1",
			"bank transfer: requested 32.50 EUR",
			"bank transfer: sent back 32.50 EUR of transfer-1",
		)
	})

	t.Run("saves a card and keeps only its last four digits in the token", func(t *testing.T) {
		services := fakeServices()

		token, err := services.open().Wallet.SaveCard("grace@example.com", "4242424242424242")
		if err != nil {
			t.Fatal(err)
		}

		if token != "tok-4242" {
			t.Errorf("token = %q, want tok-4242", token)
		}
		assertEntries(t, services.ledger, "card: saved tok-4242 for grace@example.com")
	})

	t.Run("subscribes a saved card to the tea club at 9.90 EUR a month", func(t *testing.T) {
		services := fakeServices()

		if err := services.open().TeaClub.Join("tok-4242"); err != nil {
			t.Fatal(err)
		}

		assertEntries(t, services.ledger, "card: subscribed tok-4242 to 9.90 EUR a month")
	})
}
