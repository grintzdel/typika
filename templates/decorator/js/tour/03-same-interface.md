+++
id = "same-interface"
title = "A function that takes a notifier and returns one"
file = "src/notifications/with-retry.js"
region = "decorator"
also = ["src/notifications/email-notifier.js"]
+++

`emailNotifier` now only sends: it returns a function `(recipient, message)`. That signature is the whole interface.
There is no `Notifier` to implement, because any function that takes a recipient and a message is a notifier.

`withRetry` takes a notifier and returns a new one, with the same signature. Code that calls it cannot tell whether
it talks to the bare email notifier or to one wrapped in retries. Inside, the new function calls the wrapped one,
again if it throws, up to `maxAttempts`. The wrapped notifier and the number of attempts stay in the closure.

`withRetry` does not know it wraps an email notifier. It would retry a text message, or another decorator, in exactly
the same way. That is what lets you reuse a behaviour across channels, where the base had to copy the loop.

Compare it with `decorator-ts`, where the same decorator is a class that implements `Notifier` and holds the
`Notifier` it wraps. A higher-order function says the same thing with no class and no interface.
