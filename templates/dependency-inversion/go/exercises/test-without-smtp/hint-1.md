`Service` should keep the `OrderRepository` and the `Notifier` that `New` receives, instead of building its own. Then
check who still satisfies those interfaces: `smtp.Mailer` already has the right `Notify`, but `memstore.OrderStore`
returns its own `OrderID`. Finally, decide where the real mailer and store are created now.
