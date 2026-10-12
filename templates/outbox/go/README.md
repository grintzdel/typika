# Transactional outbox: publishing order events

Every step of an order publishes an event to a message broker, and other services act on those events. This template
shows the transactional outbox in Go: each event is saved in the same database transaction as the order, and a relay,
run after each write and in a background goroutine, publishes what is pending. A loyalty consumer shows how to cope
with the duplicates that at-least-once delivery brings.

Compare it with its base, `naive-crud-go`, where the order is saved and then published, and a broker outage loses the
event.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # takes orders, survives a broker outage, then lets the relay catch up
go test ./...
```

## What to look at

- `internal/infra/in_memory_database.go`: the outbox table and the transaction that rolls both tables back.
- `internal/orders/handler.go`: each write saves the order and its event in one transaction.
- `internal/orders/outbox_relay.go`: the relay, and `Run`, its loop stopped by a `context`.
- `internal/loyalty/loyalty_points.go`: an idempotent consumer.

## Variants

- TypeScript: `outbox-ts`, where the relay runs only after each request.
