# Hexagonal architecture: the orders module

The shop's orders can be placed, paid, shipped, delivered and cancelled, and each step saves the order, charges or
refunds the card, publishes an event and emails the customer. This template shows the hexagonal architecture in Go,
also called ports and adapters: the business rules live in a core that declares the ports it needs, and HTTP,
storage, payments, email and the broker plug into it as adapters.

Compare it with its base, `naive-crud-go`, where one HTTP handler does all of it.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # places, pays, ships and cancels orders through the HTTP adapter
go test ./...
```

## What to look at

- `internal/orders/order.go`: the order and its rules, with no dependency on anything outside.
- `internal/orders/ports.go`: the driven ports the core needs, declared where they are consumed.
- `internal/orders/service.go`: the use cases, written against ports only.
- `internal/orders/adapters/`: HTTP in front, storage, payments, email and the broker behind.
- `internal/app/open_shop.go`: the one place that wires adapters to ports.

## Variants

- TypeScript: `hexagonal-ts`, where the core also declares its driving port as an interface.
- Kotlin: `hexagonal-kotlin`, with `fun interface` ports and a sealed hierarchy of domain exceptions.
