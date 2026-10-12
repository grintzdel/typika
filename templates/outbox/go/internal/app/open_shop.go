package app

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
)

type Shop struct {
	HTTP   *orders.Handler
	Relay  *orders.OutboxRelay
	Cards  *infra.CardProcessor
	Broker *infra.FakeBroker
	Mailer *infra.SMTPMailer
	Clock  *infra.ManualClock
}

func OpenShop() Shop {
	db := infra.NewInMemoryDatabase()
	cards := infra.NewCardProcessor()
	broker := infra.NewFakeBroker()
	mailer := infra.NewSMTPMailer("smtp.shop.example")
	clock := infra.NewManualClock("2026-10-01T09:00:00Z")
	relay := orders.NewOutboxRelay(db, broker)
	http := orders.NewHandler(db, cards, relay, mailer, clock)
	return Shop{HTTP: http, Relay: relay, Cards: cards, Broker: broker, Mailer: mailer, Clock: clock}
}
