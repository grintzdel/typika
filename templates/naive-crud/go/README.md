# Naive CRUD: the orders module

The shared starting point of the Go architecture templates. `orders.Handler` answers simulated HTTP requests: it
decodes the JSON body, validates it, computes the total, saves the order, charges the card, publishes an event to the
broker and emails the customer, all in one type. The order status is a set of booleans (`IsPaid`, `IsShipped`,
`IsDelivered`, `IsCancelled`), and the customer history is computed from the same rows the handler writes.

The code works and its tests pass. Each architecture template starts from it and fixes one of its problems:

- `hexagonal-go`: the business rules cannot be reached without going through HTTP.
- `cqrs-go`: the customer history is recomputed from the rows the handler writes, on every read.
- `outbox-go`: the order is saved, then published; a broker failure between the two loses the event.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # places, pays, ships and cancels orders through the handler
go test ./...
```
