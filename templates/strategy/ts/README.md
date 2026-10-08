# Strategy: shipping options

A small shop offers two shipping options, standard and express. Each one has its own pricing rules. This template
shows the Strategy pattern: every pricing rule lives behind the same `ShippingCost` interface, and the checkout picks
one at runtime without knowing how it computes its price.

Compare it with its base, `strategy-base-ts`, where the same rules are one `if / else` chain inside `ShippingQuote`.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # prints a quote for two sample orders
npm test
```

## What to look at

- `src/checkout/shipping-cost.ts`: the strategy interface.
- `src/checkout/options/`: one strategy per shipping option.
- `src/checkout/shipping-quote.ts`: the context, which uses a strategy without knowing which one.
- `src/checkout/checkout.ts`: where the strategy is chosen.

## Variants

- Go: `strategy-go`, where a strategy is a function.
- Kotlin: `strategy-kotlin`, with a `fun interface` or a lambda.
