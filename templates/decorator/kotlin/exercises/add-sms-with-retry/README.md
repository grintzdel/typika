# Send text messages with retry

Customers can now get a text message when their order ships. Texts go through a new service, `SmsGateway`, with one
method: `sendSms(phoneNumber, text)`. Like the SMTP server, it fails now and then.

A colleague already declared `createSmsNotifier(SmsServices(sms, logger))` in
`src/main/kotlin/notifications/Notifiers.kt`, left as a `TODO()`. It must return a `Notifier` that:

- texts the message to the recipient's phone number;
- retries a failed text, up to three attempts;
- logs each text once, the same way emails are logged;
- never holds a text back: a customer can receive two texts in the same minute.

Emails must keep working as they do today.

You start from the code **before** the Decorator pattern. Start with `src/main/kotlin/notifications/EmailNotifier.kt`
and `src/main/kotlin/notifications/Notifiers.kt`, and read the new tests in
`src/test/kotlin/notifications/SmsNotifierTest.kt`.

Done when all tests pass.

Once it works, count the places where "retry three times" is written. Which one would you change if retries needed a
delay?
