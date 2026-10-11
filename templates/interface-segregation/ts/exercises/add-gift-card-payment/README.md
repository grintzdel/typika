# Add gift card payments

The shop joins a gift card scheme run by a partner. Customers can now pay with `'gift-card'`: checkout asks the partner
to redeem the amount through the new `giftCards` service, declared in `src/payments/gift-cards.ts`. `redeem(amount)`
returns the payment id, or throws when the partner refuses. Each redemption is recorded in the ledger as
`gift card: redeemed <amount>`.

Gift card payments cannot be refunded: refunding one throws `Payments by gift-card cannot be refunded`. Gift cards
cannot be saved in the wallet nor used for the tea club.

You start from the code **before** the interface segregation principle. Start with `src/payments/payment-gateway.ts`
and `src/open-shop.ts`, and read the new tests in `tests/gift-card-payment.test.ts`. The test setup in
`tests/services-fixture.ts` already provides a fake `giftCards` service.

Done when all tests pass.

Once it works, count the methods of your gift card gateway that nobody will ever call.
