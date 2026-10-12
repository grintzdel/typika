# Write the email adapter

The order service tells its `Notifier` port when an order is confirmed, shipped or cancelled. The shop is wired with
an `EmailNotifier`, but the adapter was left as a stub: orders go through and customers receive nothing.

Implement `EmailNotifier` so that each `orders.Notification` becomes one email sent through the `SMTPMailer`. The
subjects and texts the customers expect are in `internal/app/notifications_test.go`. The order service and the port
must not change.

Start with `internal/orders/adapters/email_notifier.go`. `internal/orders/adapters/broker_event_publisher.go` is a
complete driven adapter you can read for reference.

Done when all tests pass.
