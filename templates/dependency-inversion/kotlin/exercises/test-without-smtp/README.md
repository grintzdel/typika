# Test the confirmation without SMTP

Support reports confirmation emails with the wrong total, and nobody can prove the checkout is right: the tests in
`src/test/kotlin/app/CheckoutTest.kt` only check ids, because every confirmation goes to the real SMTP server.

A teammate wrote the tests that are missing, in `src/test/kotlin/checkout/OrderConfirmationTest.kt`. They build a
`CheckoutService(orders, notifier)` with a fake store and a fake notifier, and check that:

- the customer is notified with the order id and total;
- the order is saved in the store the test passed;
- nothing is sent when the order cannot be saved.

To make the tests compile, the teammate declared what they pass in `src/main/kotlin/checkout/Dependencies.kt`: a
`Notifier` and an `OrderRepository` interface, and a second constructor of `CheckoutService` that still ignores them.
Make the service work with what it is given, without changing the tests. The shop itself must keep using the SMTP
mailer and the in-memory store. Start with `src/main/kotlin/checkout/CheckoutService.kt`.

Done when all tests pass.
