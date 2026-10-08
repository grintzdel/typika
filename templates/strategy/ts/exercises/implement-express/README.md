# Implement the express shipping strategy

Customers can choose express shipping at checkout, but its price is not implemented: `ExpressShipping` throws.

Express pricing:

- 12.90 for orders up to 2 kg, 18.90 above;
- never free for regular customers;
- free for members from 50.00.

Start with `src/checkout/options/express.ts`. `src/checkout/options/standard.ts` is a complete strategy you can read
for reference. The expected behaviour is in `tests/express-shipping.test.ts`.

Done when all tests pass.
