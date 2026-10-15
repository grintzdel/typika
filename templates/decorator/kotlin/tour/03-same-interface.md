+++
id = "same-interface"
title = "A notifier that holds a notifier"
file = "src/main/kotlin/notifications/RetryingNotifier.kt"
region = "decorator"
also = ["src/main/kotlin/notifications/Notifier.kt", "src/main/kotlin/notifications/EmailNotifier.kt"]
+++

`EmailNotifier` now only sends. Retrying lives in `RetryingNotifier`, and the trick is in its header: it *holds* a
`Notifier`, the one it wraps, and it *is* a `Notifier` too.

`: Notifier by inner` is Kotlin's class delegation. It implements `Notifier` by forwarding every member to `inner`,
and the class only overrides what it changes. `Notifier` has a single method, which `RetryingNotifier` overrides, so
nothing else is forwarded here. With a wider interface, every method you do not override would reach the wrapped
notifier without a line of code.

From the outside, a `RetryingNotifier` is a notifier like any other: same `notify` method, same arguments. Code that
calls it cannot tell whether it talks to a bare `EmailNotifier` or to one wrapped in retries. Inside, `notify` calls
the wrapped notifier, again if it throws, up to `maxAttempts`.

`RetryingNotifier` does not know it wraps an email notifier. It would retry a text message, or another decorator, in
exactly the same way. That is what lets you reuse a behaviour across channels, where the base had to copy the loop.
