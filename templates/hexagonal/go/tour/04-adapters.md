+++
id = "adapters"
title = "Adapters translate at the edge"
file = "internal/orders/adapters/http_orders_adapter.go"
region = "driving-adapter"
also = ["internal/orders/adapters/in_memory_order_repository.go", "internal/orders/adapters/email_notifier.go"]
+++

An adapter connects one technology to one port. `HTTPOrdersAdapter` is a **driving** adapter: it decodes the JSON
into an `OrderRequest`, calls the use case, and turns the domain's errors into status codes. `Handle` is the only place
that knows a conflict is a 409, with one `errors.Is` per sentinel.

The **driven** adapters go the other way. `InMemoryOrderRepository` maps an `Order` to the database row and back, and
`EmailNotifier` turns a `Notification` into the subject and body that `SMTPMailer` expects. Each one starts with a
`var _ orders.Notifier = (*EmailNotifier)(nil)` line: Go checks the port is satisfied at compile time, not when the
shop is wired. The types in `internal/infra/` did not change: they stand for libraries you do not own.

Swapping the store for a real database, or email for text messages, means writing a new adapter for the same port.
The core does not change.
