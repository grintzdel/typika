# Dependency inversion base: confirming an order

The starting point of `dependency-inversion-kotlin`. When a customer places an order, `CheckoutService` saves it and
emails a confirmation. It creates its `SmtpMailer` and its `InMemoryOrderStore` itself, in its property initializers.

The code works and its tests pass, but they cannot check the confirmation, and every run talks to the SMTP server.
Open `dependency-inversion-kotlin` to see the same behaviour with the dependencies inverted, or start the
`test-without-smtp` exercise there to feel why the principle exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places two orders; the SMTP mailer prints what it would send
gradle test
```
