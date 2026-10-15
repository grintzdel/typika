# Interface segregation base: payment methods

The starting point of `interface-segregation-kotlin`. The shop takes cards and bank transfers, saves cards and runs a
tea club subscription. Every payment method implements the same `PaymentGateway`, with `charge`, `refund`, `saveCard`
and `subscribe`, so `BankTransferGateway` throws from the two it cannot do.

The code works and its tests pass. Open `interface-segregation-kotlin` to see the same behaviour with small interfaces,
or start the `add-gift-card-payment` exercise there to feel why the principle exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # runs a few payments and prints the ledger
gradle test
```
