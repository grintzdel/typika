# Write the email adapter

The order service tells its `Notifier` port when an order is confirmed, shipped or cancelled. The shop is wired with
an `EmailNotifier`, but the adapter was left as a stub: orders go through and customers receive nothing.

Implement `EmailNotifier` so that each `OrderNotification` becomes one email sent through the `SmtpMailer`. The
subjects and texts the customers expect are in `src/test/kotlin/app/NotificationsTest.kt`. The order service and the
port must not change.

Start with `src/main/kotlin/orders/adapters/EmailNotifier.kt`. `BrokerEventPublisher.kt`, next to it, is a complete
driven adapter you can read for reference.

Done when all tests pass.
