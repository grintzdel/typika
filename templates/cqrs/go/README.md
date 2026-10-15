# CQRS: the customer order history

The shop's orders can be placed, paid, shipped, delivered and cancelled, and each customer has a history: how many
orders, how much spent, the status of the last one. This template shows CQRS in Go, command query responsibility
segregation: commands change the order rows, each change is recorded as an event, and projections turn those events
into read models shaped for the screens that read them.

Compare it with its base, `naive-crud-go`, where the history is recomputed from the order rows on every read.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # places, pays, ships and cancels orders, then reads a customer's history
go test ./...
```

## What to look at

- `internal/orders/write/`: the command structs and the handler methods that apply them to the write model.
- `internal/orders/events/events.go`: what the write side says happened.
- `internal/orders/read/`: the read models, kept in maps, and the projections that build them.
- `internal/orders/handler.go`: commands for `POST`, read models only for `GET`.
- `internal/app/open_shop.go`: the projections the write side feeds.

## Variants

- TypeScript: `cqrs-ts`, with a union of commands that one `execute` method dispatches.
- Kotlin: `cqrs-kotlin`, with sealed commands and events that every `when` must handle.
