+++
id = "same-interface"
title = "A notifier that holds a notifier"
file = "src/notifications/retrying-notifier.ts"
region = "decorator"
also = ["src/notifications/notifier.ts", "src/notifications/email-notifier.ts"]
+++

`EmailNotifier` now only sends. Retrying lives in `RetryingNotifier`, and the trick is in its first line: it
*implements* `Notifier`, and it *holds* a `Notifier`, the one it wraps.

From the outside, a `RetryingNotifier` is a notifier like any other: same `notify` method, same arguments. Code that
calls it cannot tell whether it talks to a bare `EmailNotifier` or to one wrapped in retries. Inside, `notify` calls
the wrapped notifier, again if it throws, up to `maxAttempts`.

`RetryingNotifier` does not know it wraps an email notifier. It would retry a text message, or another decorator, in
exactly the same way. That is what lets you reuse a behaviour across channels, where the base had to copy the loop.
