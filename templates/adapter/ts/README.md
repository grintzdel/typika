# Adapter: taking payments

The shop takes payments through LegacyPay, a third-party SDK with its own conventions: amounts in cents, currencies as
ISO numeric codes, results as numeric response codes. This template shows the Adapter pattern: the checkout talks to a
`PaymentGateway` interface written for the shop, and `LegacyPayAdapter` translates between that interface and the SDK.

Compare it with its base, `adapter-base-ts`, where `Checkout` and `Cancellation` call the SDK directly.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # pays with a few test cards, then cancels the paid order
npm test
```

## What to look at

- `src/vendor/legacy-pay/legacy-pay-client.ts`: the SDK, which the shop cannot change.
- `src/payments/payment-gateway.ts`: the interface the shop wants.
- `src/payments/legacy-pay-adapter.ts`: the adapter, which translates calls, units and codes.
- `src/checkout/`: the code that uses payments, which no longer knows LegacyPay.

## Variants

- Go: `adapter-go`, where the adapter satisfies the gateway implicitly and SwiftPay reports Go errors.
- Kotlin: `adapter-kotlin`, with a sealed result type and extension functions as the lighter alternative.
