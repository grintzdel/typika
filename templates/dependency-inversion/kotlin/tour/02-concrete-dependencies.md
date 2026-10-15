+++
id = "concrete-dependencies"
title = "Glued to the infrastructure"
+++

Before this template, `CheckoutService` created what it used:

```kotlin
class CheckoutService {
    private val orders = InMemoryOrderStore()
    private val notifier = SmtpMailer("smtp.shop.example", 587)
    …
}
```

It reads well, and it is easy to call: `CheckoutService()` and you are done. The cost is hidden in those two
properties. The checkout depends on concrete classes, so it depends on everything they depend on: an SMTP host, a port,
a storage format.

A test cannot replace them. Every test run sends real emails, and no test can check what they said, so the email
total is the one behaviour nobody verifies. Switching to another email provider means editing the checkout, the code
that should change least.

Open **Diff from base** to see the full before and after.
