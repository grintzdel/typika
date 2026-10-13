# Single responsibility base: placing an order

The starting point of `single-responsibility-kotlin`. When a customer places an order, the shop checks it, works out
the price, saves it and emails an invoice. `OrderService.placeOrder` does all of it in one method.

The code works and its tests pass. Open `single-responsibility-kotlin` to see the same behaviour split by reason to
change, or start the `add-pdf-invoice` exercise there to feel why the principle exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places two sample orders and prints their invoices
gradle test
```
