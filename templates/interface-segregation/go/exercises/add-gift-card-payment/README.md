# Add gift card payments

The shop joins a gift card scheme run by a partner. Customers can now pay with `"gift-card"`: checkout asks the partner
to redeem the amount through the new `GiftCards` service, declared in `internal/payments/gift_cards.go` and passed to
`OpenShop` in `Services.GiftCards`. `Redeem(amount)` returns the payment id, or an error when the partner refuses.
Each redemption is recorded in the ledger as `gift card: redeemed <amount>`.

Gift card payments cannot be refunded: refunding one returns the error `payments by gift-card cannot be refunded`.
Gift cards cannot be saved in the wallet nor used for the tea club.

You start from the code **before** the interface segregation principle. Start with `internal/payments/gateway.go` and
`internal/app/open_shop.go`, and read the new tests in `internal/app/gift_card_payment_test.go`. The test setup in
`internal/app/services_fixture_test.go` already provides a fake `GiftCards` service.

Done when all tests pass.

Once it works, count the methods of your gift card gateway that nobody will ever call.
