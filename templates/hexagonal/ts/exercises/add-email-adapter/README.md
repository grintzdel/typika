# Write the email adapter

The order service tells its `Notifier` port when an order is confirmed, shipped or cancelled. The shop is wired with
an `EmailNotifier`, but the adapter was left as a stub: orders go through and customers receive nothing.

Implement `EmailNotifier` so that each `OrderNotification` becomes one email sent through the `SmtpMailer`. The
subjects and texts the customers expect are in `tests/notifications.test.ts`. The order service and the port must not
change.

Start with `src/orders/adapters/email-notifier.ts`. `src/orders/adapters/broker-event-publisher.ts` is a complete
driven adapter you can read for reference.

Done when all tests pass.
