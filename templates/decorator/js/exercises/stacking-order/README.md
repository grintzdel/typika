# Log each notification once

Support reads the notification log to answer customers who say they never got an email. Since the last release, the
log no longer makes sense: one email can show up as "failed" twice and then "notified", and an email that never left
can be logged as failed three times.

Each email must appear once in the log: `notified <recipient>` when it was sent, or `failed to notify <recipient>:
<reason>` when every attempt failed. The decorators themselves are correct.

Start with `src/notifications/notifiers.js`. The expected behaviour is in `tests/email-notifier.test.js`.

Done when all tests pass.
