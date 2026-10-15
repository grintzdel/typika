# Add gift card payments

The shop joins a gift card scheme run by a partner. Customers can now pay with a new `PaymentMethod` labelled
`gift-card`: checkout asks the partner to redeem the amount through the new `GiftCards` service, declared in
`src/main/kotlin/payments/GiftCards.kt` and passed to `openShop` in `ShopServices`. `redeem(amount)` returns the payment
id, or throws when the partner refuses. Each redemption is recorded in the ledger as `gift card: redeemed <amount>`.

Gift card payments cannot be refunded: refunding one throws with the message
`Payments by gift-card cannot be refunded`. Gift cards cannot be saved in the wallet nor used for the tea club.

You start from the code **before** the interface segregation principle. Start with
`src/main/kotlin/payments/PaymentGateway.kt` and `src/main/kotlin/app/OpenShop.kt`, and read the new tests in
`src/test/kotlin/app/GiftCardPaymentTest.kt`. The test setup in `ServicesFixture.kt` already provides a fake
`GiftCards` service.

Done when all tests pass.

Once it works, count the methods of your gift card gateway that nobody will ever call.
