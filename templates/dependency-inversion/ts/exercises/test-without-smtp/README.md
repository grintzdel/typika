# Test the confirmation without SMTP

Support reports confirmation emails with the wrong total, and nobody can prove the checkout is right: the tests in
`tests/checkout.test.ts` only check ids, because every confirmation goes to the real SMTP server.

A teammate wrote the tests that are missing, in `tests/order-confirmation.test.ts`. They build a `CheckoutService`
with a fake notifier and a store of their choice, and check that:

- the customer is notified with the order id and total;
- the order is saved in the store the test passed;
- nothing is sent when the order cannot be saved.

Make `CheckoutService` work with what it is given, without changing the tests. The shop itself must keep using the
SMTP mailer and the in-memory store. Start with `src/checkout/checkout-service.ts`.

Done when all tests pass.
