# Send text messages with retry

Customers can now get a text message when their order ships. Texts go through a new service, `sms`, with one method:
`sendSms(phoneNumber, text)`. Like the SMTP server, it fails now and then.

`createSmsNotifier({ sms, logger })` must return a notifier, a function `(recipient, message)` like the one
`createEmailNotifier` returns, that:

- texts the message to the recipient's phone number;
- retries a failed text, up to three attempts;
- logs each text once, the same way emails are logged;
- never holds a text back: a customer can receive two texts in the same minute.

Emails must keep working as they do today.

You start from the code **before** the Decorator pattern. Start with `src/notifications/email-notifier.js` and
`src/notifications/notifiers.js`, and read the new tests in `tests/sms-notifier.test.js`.

Done when all tests pass.

Once it works, count the places where "retry three times" is written. Which one would you change if retries needed a
delay?
