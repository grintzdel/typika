package checkout_test

import (
	"slices"
	"testing"

	"example.com/shop/internal/checkout"
	"example.com/shop/internal/payments"
	"example.com/shop/internal/shop"
)

type onlyCharges struct {
	charged []shop.Money
}

func (f *onlyCharges) Charge(amount shop.Money) (payments.Payment, error) {
	f.charged = append(f.charged, amount)
	return payments.Payment{ID: "fake-1", Method: payments.Card, Amount: amount}, nil
}

func TestCheckout(t *testing.T) {
	t.Run("pays through any method that can charge, and nothing more", func(t *testing.T) {
		fake := &onlyCharges{}

		_, err := checkout.New(map[payments.Method]checkout.Charger{
			payments.Card:         fake,
			payments.BankTransfer: fake,
		}).Pay(payments.Card, shop.EUR(1500))
		if err != nil {
			t.Fatal(err)
		}

		if want := []shop.Money{shop.EUR(1500)}; !slices.Equal(fake.charged, want) {
			t.Errorf("charged = %v, want %v", fake.charged, want)
		}
	})
}
