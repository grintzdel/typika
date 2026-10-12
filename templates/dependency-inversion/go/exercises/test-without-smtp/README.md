# Test the confirmation without SMTP

Support reports confirmation emails with the wrong total, and nobody can prove the checkout is right: the tests in
`internal/app/checkout_test.go` only check ids, because every confirmation goes to the real SMTP server.

A teammate wrote the tests that are missing, in `internal/checkout/order_confirmation_test.go`. They build a checkout
service with `checkout.New(orders, notifier)`, passing a fake notifier and a fake store, and check that:

- the customer is notified with the order id and total;
- the order is saved in the store the test passed;
- nothing is sent when the order cannot be saved.

To make the tests compile, the teammate declared what they pass in `internal/checkout/dependencies.go`: a `Notifier`
and an `OrderRepository` interface, and a `New` that still ignores them. Make the service work with what it is given,
without changing the tests. The shop itself must keep using the SMTP mailer and the in-memory store. Start with
`internal/checkout/service.go` and `dependencies.go`.

Done when all tests pass.
