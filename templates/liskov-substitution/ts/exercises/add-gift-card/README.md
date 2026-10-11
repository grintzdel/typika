# Add a gift card

The shop starts selling gift cards. A gift card is paid like any product, but nothing is shipped and nothing is
downloaded: its code is emailed by another service after the payment. At checkout, a gift card adds its price to the
total and nothing else. A cart of gift cards only charges no shipping.

A colleague already started `GiftCard` in `src/catalog/gift-card.ts`. It extends `PhysicalProduct`, like every other
product, with a weight of 0 g. The tests in `tests/gift-card.test.ts` show what is still wrong.

You start from the code **before** the Liskov substitution principle. Start with `src/catalog/gift-card.ts` and
`src/checkout/checkout.ts`.

Done when all tests pass.

Once it works, look at `checkout`. How many kinds of product does it know by name, and how many will it know after the
next one?
