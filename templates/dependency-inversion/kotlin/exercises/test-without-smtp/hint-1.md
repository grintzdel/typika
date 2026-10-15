`CheckoutService` should keep the `OrderRepository` and the `Notifier` it receives, instead of building its own: in
Kotlin, that is its primary constructor. Then make `SmtpMailer` and `InMemoryOrderStore` implement those interfaces,
and decide where the real mailer and store are created now.
