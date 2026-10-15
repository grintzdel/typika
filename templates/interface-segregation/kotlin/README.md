# Interface segregation: payment methods

The shop takes cards and bank transfers, saves cards and runs a tea club subscription. This template shows the
interface segregation principle: instead of one `PaymentGateway` with four methods, each client depends on a small
interface with the one method it calls, and each payment method implements only what it can do. Each of these roles is
a `fun interface`, so a test fake is a lambda.

Compare it with its base, `interface-segregation-base-kotlin`, where a bank transfer has to throw from `saveCard` and
`subscribe`.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # runs a few payments and prints the ledger
gradle test
```

## What to look at

- `src/main/kotlin/payments/Capabilities.kt`: `Chargeable`, `Refundable`, `CardVault` and `RecurringPayments`.
- `src/main/kotlin/payments/clients/`: each client asks for the one capability it uses.
- `src/main/kotlin/payments/gateways/`: the card implements four capabilities, the bank transfer two.
- `src/main/kotlin/app/OpenShop.kt`: where each client receives its capability.

## Variants

- TypeScript: `interface-segregation-ts`, with classes that `implements` each role.
