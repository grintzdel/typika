# Strategy: shipping options

A small shop offers two shipping options, standard and express. Each one has its own pricing rules. This template
shows the Strategy pattern in Go: every pricing rule is a function with the same `ShippingCost` signature, and the
checkout picks one at runtime without knowing how it computes its price.

Compare it with its base, `strategy-base-go`, where the same rules are one chain of `if` statements.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # prints a quote for two sample orders
go test ./...
```

## What to look at

- `internal/checkout/shipping_cost.go`: the strategy, a function type.
- `internal/checkout/standard.go`, `express.go`: one strategy per shipping option.
- `internal/checkout/quote.go`: the context, which uses a strategy without knowing which one.
- `internal/checkout/checkout.go`: where the strategy is chosen.

## Variants

- TypeScript: `strategy-ts`, with an interface and a class per option.
- Kotlin: `strategy-kotlin`, with a `fun interface` or a lambda.
