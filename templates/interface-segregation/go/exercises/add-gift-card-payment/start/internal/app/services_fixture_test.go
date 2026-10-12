package app_test

import (
	"example.com/shop/internal/app"
	"example.com/shop/internal/shop"
)

type fakeGiftCards struct {
	redeemed []shop.Money
	refusal  error
}

func (f *fakeGiftCards) Redeem(amount shop.Money) (string, error) {
	if f.refusal != nil {
		return "", f.refusal
	}
	f.redeemed = append(f.redeemed, amount)
	return "gift-1", nil
}

type fakes struct {
	ledger    *shop.Ledger
	giftCards *fakeGiftCards
}

func fakeServices() fakes {
	return fakes{ledger: &shop.Ledger{}, giftCards: &fakeGiftCards{}}
}

func (f fakes) open() app.Shop {
	return app.OpenShop(app.Services{Ledger: f.ledger, GiftCards: f.giftCards})
}
