package app

import (
	"example.com/shop/internal/infra"
	"example.com/shop/internal/orders"
	"example.com/shop/internal/orders/adapters"
)

type Shop struct {
	HTTP      *adapters.HTTPOrdersAdapter
	CSVImport *adapters.CSVImportAdapter
	Cards     *infra.CardProcessor
	Broker    *infra.FakeBroker
	Mailer    *infra.SMTPMailer
	Clock     *infra.ManualClock
}

// #region tour:wiring
func OpenShop() Shop {
	cards := infra.NewCardProcessor()
	broker := infra.NewFakeBroker()
	mailer := infra.NewSMTPMailer("smtp.shop.example")
	clock := infra.NewManualClock("2026-10-01T09:00:00Z")
	service := orders.NewService(
		adapters.NewInMemoryOrderRepository(infra.NewInMemoryDatabase()),
		adapters.NewCardPaymentGateway(cards),
		adapters.NewEmailNotifier(mailer),
		adapters.NewBrokerEventPublisher(broker),
		clock,
	)
	http := adapters.NewHTTPOrdersAdapter(service)
	csvImport := adapters.NewCSVImportAdapter(service)
	return Shop{HTTP: http, CSVImport: csvImport, Cards: cards, Broker: broker, Mailer: mailer, Clock: clock}
}

// #endregion
