package app

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
)

type Shop struct {
	HTTP   *orders.Handler
	Relay  Relay
	Cards  *infra.CardProcessor
	Broker *infra.FakeBroker
	Mailer *infra.SMTPMailer
	Clock  *infra.ManualClock
}

type Relay struct{}

func (Relay) PublishPending() int {
	return 0
}

func OpenShop() Shop {
	cards := infra.NewCardProcessor()
	broker := infra.NewFakeBroker()
	mailer := infra.NewSMTPMailer("smtp.shop.example")
	clock := infra.NewManualClock("2026-10-01T09:00:00Z")
	http := orders.NewHandler(infra.NewInMemoryDatabase(), cards, broker, mailer, clock)
	return Shop{HTTP: http, Cards: cards, Broker: broker, Mailer: mailer, Clock: clock}
}
