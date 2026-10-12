package app

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
)

type Shop struct {
	HTTP   *orders.Handler
	Cards  *infra.CardProcessor
	Broker *infra.FakeBroker
	Mailer *infra.SMTPMailer
	Clock  *infra.ManualClock
}

func OpenShop() Shop {
	cards := infra.NewCardProcessor()
	broker := infra.NewFakeBroker()
	mailer := infra.NewSMTPMailer("smtp.shop.example")
	clock := infra.NewManualClock("2026-10-01T09:00:00Z")
	http := orders.NewHandler(infra.NewInMemoryDatabase(), cards, broker, mailer, clock)
	return Shop{HTTP: http, Cards: cards, Broker: broker, Mailer: mailer, Clock: clock}
}
