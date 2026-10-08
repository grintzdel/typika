# Add a pickup-point shipping option

The shop now partners with a network of pickup points. Customers collect their parcel in a nearby shop, which is
cheaper to deliver, so the pricing differs from the existing options:

- a flat 2.90, whatever the weight;
- free from 25.00;
- always free for members.

Standard and express shipping must keep their current prices.

You start from the code **before** the Strategy pattern. Start with `internal/checkout/checkout.go` and
`internal/checkout/shipping_option.go`, and read the new tests in `internal/checkout/pickup_point_test.go`.

Done when all tests pass.

Once it works, look at your `shippingCost` function. Could someone add a fourth option next month without reading the
rules of the other three?
