# Adapter: taking payments

The shop takes payments through LegacyPay, a third-party SDK with its own conventions: amounts in cents, currencies as
ISO numeric codes, results as numeric response codes. This template shows the Adapter pattern: the checkout talks to a
`PaymentGateway` interface written for the shop, and `LegacyPayAdapter` translates between that interface and the SDK.

Compare it with its base, `adapter-base-kotlin`, where `Checkout` and `Cancellation` call the SDK directly.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # pays with a few test cards, then cancels the paid order
gradle test
```

## What to look at

- `src/main/kotlin/vendor/legacypay/LegacyPayClient.kt`: the SDK, which the shop cannot change.
- `src/main/kotlin/payments/PaymentGateway.kt`: the interface the shop wants, with a sealed result.
- `src/main/kotlin/payments/LegacyPayAdapter.kt`: the adapter, which translates calls, units and codes.
- `src/main/kotlin/checkout/`: the code that uses payments, which no longer knows LegacyPay.

## Variants

- TypeScript: `adapter-ts`, with a class that `implements` the gateway.
- Go: `adapter-go`, where the adapter satisfies the gateway implicitly and SwiftPay reports Go errors.
