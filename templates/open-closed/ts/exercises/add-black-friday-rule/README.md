# Add a Black Friday discount

Marketing wants a Black Friday sale: every order placed on `2026-11-27` gets 20% off. It adds up with the other
discounts, and like them it is computed on the full price.

The receipt shows it as `Black Friday (20%): -<amount>`, after the other discounts. The total charged must match the
receipt.

You start from the code **before** the open/closed principle. Start with `src/pricing/price-order.ts` and
`src/receipts/receipt.ts`, and read the new tests in `tests/black-friday.test.ts`.

Done when all tests pass.

Once it works, count the files you edited that are not about Black Friday. What will you edit for the next sale?
