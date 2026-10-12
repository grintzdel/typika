# Dependency inversion: confirming an order

When a customer places an order, the shop saves it and emails a confirmation. This template shows the dependency
inversion principle in Go: the `checkout` package declares the `Notifier` and `OrderRepository` it needs,
`checkout.New` receives them, and the package never imports the SMTP mailer or the store that implement them.

Compare it with its base, `dependency-inversion-base-go`, where the checkout service creates both itself.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # places two orders; the SMTP mailer prints what it would send
go test ./...
```

## What to look at

- `internal/checkout/dependencies.go`: the interfaces, owned by the checkout.
- `internal/checkout/service.go`: receives its dependencies and names no implementation.
- `internal/memstore/`, `internal/smtp/`: the store and the mailer, which fit the checkout's interfaces.
- `internal/app/open_shop.go`: the composition root, the one place that picks the implementations.

## Variants

- TypeScript: `dependency-inversion-ts`, with classes that `implements` the interfaces.
