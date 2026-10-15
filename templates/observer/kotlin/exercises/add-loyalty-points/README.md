# Add loyalty points

The shop is trying out a loyalty programme with short campaigns. While a campaign runs, members earn one point per
full euro of every order they place. Regular customers earn nothing, and nobody earns points outside a campaign.

The shop needs a way to start a campaign and to end it later: `shop.startLoyaltyCampaign()` starts one and returns a
function that ends it. Points are awarded through a new service, `loyalty`, with one method:
`award(customerEmail, points)`.

A colleague already declared `startLoyaltyCampaign` in `src/main/kotlin/app/OpenShop.kt`, left as a `TODO()`, and
added the `loyalty` service to `ShopServices`. Placing an order must keep reserving the stock, confirming by email
and tracking the sale, campaign or not.

You start from the code **before** the Observer pattern. Start with `src/main/kotlin/app/OpenShop.kt` and
`src/main/kotlin/orders/PlaceOrder.kt`, and read the new tests in `src/test/kotlin/app/LoyaltyPointsTest.kt`. The test
setup in `ServicesFixture.kt` already provides a fake `loyalty` service.

Done when all tests pass.

Once it works, look at `placeOrder`. What did it have to learn about loyalty campaigns, and what will it have to learn
for the next reaction?
