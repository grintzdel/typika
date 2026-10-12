+++
id = "same-interface"
title = "A notifier that holds a notifier"
file = "internal/notifications/retrying.go"
region = "decorator"
also = ["internal/notifications/notifier.go", "internal/notifications/email.go"]
+++

`Email` now only sends. Retrying lives in `Retrying`, and the trick is in its first field: it *embeds* a `Notifier`,
the one it wraps, and it has its own `Notify` method, so it *is* a `Notifier` too.

From the outside, a `*Retrying` is a notifier like any other: same `Notify` method, same arguments. Code that calls it
cannot tell whether it talks to a bare `Email` or to one wrapped in retries. Inside, `Notify` calls
`r.Notifier.Notify`, again if it returns an error, up to `maxAttempts`.

Embedding is the Go way to write "holds one and forwards the rest". `Notifier` has a single method, which `Retrying`
overrides, so nothing else is forwarded here. With a wider interface, every method you do not override would reach
the wrapped value on its own.

`Retrying` does not know it wraps an email notifier. It would retry a text message, or another decorator, in exactly
the same way.
