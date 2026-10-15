# Adapter base: taking payments

The starting point of `adapter-kotlin`. The shop takes payments through LegacyPay, a third-party SDK with its own
conventions: amounts in cents, currencies as ISO numeric codes, results as numeric response codes. `Checkout` and
`Cancellation` call the SDK directly, and each one reads its codes.

The code works and its tests pass. Open `adapter-kotlin` to see the same behaviour with the Adapter pattern, or start
the `switch-provider` exercise there to feel why the pattern exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # pays with a few test cards, then cancels the paid order
gradle test
```
