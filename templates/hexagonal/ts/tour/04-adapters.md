+++
id = "adapters"
title = "Adapters translate at the edge"
file = "src/orders/adapters/http-orders-adapter.ts"
region = "driving-adapter"
also = ["src/orders/adapters/in-memory-order-repository.ts", "src/orders/adapters/email-notifier.ts"]
+++

An adapter connects one technology to one port. `HttpOrdersAdapter` is a **driving** adapter: it turns a request into
a call to `OrderUseCases`, and turns the domain's errors into status codes. `errorResponse` is the only place that
knows a conflict is a 409.

The **driven** adapters go the other way. `InMemoryOrderRepository` maps an `Order` to the database row and back, and
`EmailNotifier` turns an `OrderNotification` into the subject and body that `SmtpMailer` expects. The infrastructure
classes in `src/infrastructure/` did not change: they stand for libraries you do not own.

Each adapter is small and does one translation. Swapping the store for a real database, or email for text messages,
means writing a new adapter for the same port. The core does not change.
