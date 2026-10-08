# Strategy base: shipping options

The starting point of `strategy-kotlin`. A small shop offers standard and express shipping, and `shippingCost` prices
both with one `if` / `else` chain on the shipping option.

The code works and its tests pass. Open `strategy-kotlin` to see the same behaviour with the Strategy pattern, or start
the `add-pickup-point-option` exercise there to feel why the pattern exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # prints a quote for two sample orders
gradle test
```
