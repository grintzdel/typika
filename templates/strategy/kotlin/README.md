# Strategy: shipping options

A small shop offers two shipping options, standard and express. Each one has its own pricing rules. This template
shows the Strategy pattern in Kotlin: every pricing rule implements the same `ShippingCost` functional interface, and
the checkout picks one at runtime without knowing how it computes its price.

Compare it with its base, `strategy-base-kotlin`, where the same rules are one `if` / `else` chain.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # prints a quote for two sample orders
gradle test
```

## What to look at

- `src/main/kotlin/checkout/ShippingCost.kt`: the strategy, a `fun interface`.
- `src/main/kotlin/checkout/StandardShipping.kt`, `ExpressShipping.kt`: one strategy per shipping option.
- `src/main/kotlin/checkout/ShippingQuote.kt`: the context, which uses a strategy without knowing which one.
- `src/main/kotlin/checkout/Checkout.kt`: where the strategy is chosen.

## Variants

- TypeScript: `strategy-ts`, with an interface and a class per option.
- Go: `strategy-go`, where a strategy is a plain function.
