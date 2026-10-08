# Implement the express shipping strategy

Customers can choose express shipping at checkout, but its price is not implemented: `ExpressShipping` always returns
0.00.

Express pricing:

- 12.90 for orders up to 2 kg, 18.90 above;
- never free for regular customers;
- free for members from 50.00.

Start with `internal/checkout/express.go`. `internal/checkout/standard.go` is a complete strategy you can read for
reference. The expected behaviour is in `internal/checkout/express_shipping_test.go`.

Done when all tests pass.
