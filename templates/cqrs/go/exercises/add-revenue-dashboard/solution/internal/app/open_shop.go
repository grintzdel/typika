package app

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
	"example.com/shop/internal/orders/read"
	"example.com/shop/internal/orders/write"
)

type Shop struct {
	HTTP   *orders.Handler
	Cards  *infra.CardProcessor
	Broker *infra.FakeBroker
	Mailer *infra.SMTPMailer
	Clock  *infra.ManualClock
}

// #region tour:wiring
func OpenShop() Shop {
	cards := infra.NewCardProcessor()
	broker := infra.NewFakeBroker()
	mailer := infra.NewSMTPMailer("smtp.shop.example")
	clock := infra.NewManualClock("2026-10-01T09:00:00Z")
	orderViews := read.NewOrderViews()
	customerSummaries := read.NewCustomerOrderSummaries()
	revenueByDay := read.NewRevenueByDay()
	commands := write.NewCommandHandler(
		infra.NewInMemoryDatabase(), cards, broker, mailer, clock,
		orderViews, customerSummaries, revenueByDay,
	)
	http := orders.NewHandler(commands, orderViews, customerSummaries, revenueByDay)
	return Shop{HTTP: http, Cards: cards, Broker: broker, Mailer: mailer, Clock: clock}
}

// #endregion
