# Forbid cancelling a shipped order

The warehouse reports parcels on their way for orders the shop marked cancelled and refunded. A shipped order must not
be cancelled any more: the customer has to wait for the delivery and return it.

The rule belongs to the transition table in `src/main/kotlin/orders/OrderState.kt`. Fix it. The expected behaviour is in
`src/test/kotlin/app/OrderLifecycleTest.kt`.

Done when all tests pass.
