+++
id = "adapters"
title = "Adapters translate at the edge"
file = "src/main/kotlin/orders/adapters/HttpOrdersAdapter.kt"
region = "driving-adapter"
also = [
  "src/main/kotlin/orders/adapters/InMemoryOrderRepository.kt",
  "src/main/kotlin/orders/adapters/EmailNotifier.kt",
]
+++

An adapter connects one technology to one port. `HttpOrdersAdapter` is a **driving** adapter: it reads the body into
an `OrderRequest`, calls the use case, and turns the domain's exceptions into status codes. `statusCodeOf` is the only
place that knows a conflict is a 409, and because `OrderException` is sealed, its `when` has no `else`: a new kind of
refusal in the domain stops this adapter from compiling until it picks a status.

The **driven** adapters go the other way. `InMemoryOrderRepository` maps an `Order` to the database row and back, and
`EmailNotifier` turns an `OrderNotification` into the subject and body that `SmtpMailer` expects. The classes in
`infrastructure` did not change: they stand for libraries you do not own.

Each adapter is small and does one translation. Swapping the store for a real database, or email for text messages,
means writing a new adapter for the same port. The core does not change.
