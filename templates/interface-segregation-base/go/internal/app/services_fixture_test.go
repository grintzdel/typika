package app_test

import (
	"example.com/shop/internal/app"
	"example.com/shop/internal/shop"
)

type fakes struct {
	ledger *shop.Ledger
}

func fakeServices() fakes {
	return fakes{ledger: &shop.Ledger{}}
}

func (f fakes) open() app.Shop {
	return app.OpenShop(app.Services{Ledger: f.ledger})
}
