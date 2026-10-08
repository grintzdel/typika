# Implement the express shipping strategy

Customers can choose express shipping at checkout, but its price is not implemented: `ExpressShipping` always returns
0.00.

Express pricing:

- 12.90 for orders up to 2 kg, 18.90 above;
- never free for regular customers;
- free for members from 50.00.

Start with `src/main/kotlin/checkout/ExpressShipping.kt`. `src/main/kotlin/checkout/StandardShipping.kt` is a complete
strategy you can read for reference. The expected behaviour is in `src/test/kotlin/checkout/ExpressShippingTest.kt`.

Done when all tests pass.
