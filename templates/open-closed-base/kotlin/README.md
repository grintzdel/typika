# Open/closed base: discounts

The starting point of `open-closed-kotlin`. The shop gives members 10% off and everyone 5.00 EUR off from 100.00 EUR.
Both discounts are decided twice: once in `totalOf`, to charge the customer, and once in `receiptFor`, to show them.

The code works and its tests pass. Open `open-closed-kotlin` to see the same behaviour as a list of discount rules, or
start the `add-black-friday-rule` exercise there to feel why the principle exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # prints the receipts of two sample orders
gradle test
```
