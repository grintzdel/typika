# Interface segregation: payment methods

The shop takes cards and bank transfers, saves cards and runs a tea club subscription. This template shows the
interface segregation principle: instead of one `PaymentGateway` with four methods, each client depends on a small
interface with the one method it calls, and each payment method implements only what it can do.

Compare it with its base, `interface-segregation-base-ts`, where a bank transfer has to throw from `saveCard` and
`subscribe`.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # runs a few payments and prints the ledger
npm test
```

## What to look at

- `src/payments/capabilities.ts`: `Chargeable`, `Refundable`, `CardVault` and `RecurringPayments`.
- `src/payments/clients/`: each client asks for the one capability it uses.
- `src/payments/gateways/`: the card implements four capabilities, the bank transfer two.
- `src/open-shop.ts`: where each client receives its capability.

## Variants

- Go: `interface-segregation-go`, where each client declares its interface and gateways satisfy it implicitly.
