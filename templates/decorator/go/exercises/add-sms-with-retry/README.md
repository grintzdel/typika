# Send text messages with retry

Customers can now get a text message when their order ships. Texts go through a new service, an `SmsGateway`, with
one method: `SendSms(phoneNumber, text)`. Like the SMTP server, it fails now and then.

`NewSmsNotifier(SmsServices{Sms: …, Logger: …})` must return a `Notifier` that:

- texts the message to the recipient's phone number;
- retries a failed text, up to three attempts;
- logs each text once, the same way emails are logged;
- never holds a text back: a customer can receive two texts in the same minute.

Emails must keep working as they do today.

You start from the code **before** the Decorator pattern. So that the tests compile, a teammate declared the gateway
and an `Sms` notifier that does nothing yet, in `internal/notifications/sms.go`. Start there and with
`internal/notifications/email.go`, and read the new tests in `internal/notifications/sms_notifier_test.go`.

Done when all tests pass.

Once it works, count the places where "retry three times" is written. Which one would you change if retries needed a
delay?
