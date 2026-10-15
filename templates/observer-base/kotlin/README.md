# Observer base: reacting to an order

The starting point of `observer-kotlin`. When a customer places an order, the shop reserves the stock, emails a
confirmation and tracks the sale. `placeOrder` does all three itself, one call after the other.

The code works and its tests pass. Open `observer-kotlin` to see the same behaviour with the Observer pattern, or start
the `add-loyalty-points` exercise there to feel why the pattern exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places two sample orders and prints every reaction
gradle test
```
