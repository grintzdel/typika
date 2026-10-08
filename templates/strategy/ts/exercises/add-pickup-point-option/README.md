# Add a pickup-point shipping option

The shop now partners with a network of pickup points. Customers collect their parcel in a nearby shop, which is
cheaper to deliver, so the pricing differs from the existing options:

- a flat 2.90, whatever the weight;
- free from 25.00;
- always free for members.

Standard and express shipping must keep their current prices.

You start from the code **before** the Strategy pattern. Start with `src/checkout/shipping-quote.ts` and
`src/checkout/shipping-option.ts`, and read the new tests in `tests/pickup-point.test.ts`.

Done when all tests pass.

Once it works, look at your `shippingCost` method. Could someone add a fourth option next month without reading the
rules of the other three?
