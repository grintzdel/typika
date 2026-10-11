+++
id = "wrapping"
title = "Before, after or around the call"
file = "src/notifications/with-logging.js"
region = "around"
also = ["src/notifications/with-throttle.js"]
+++

Every decorator follows the same shape: do something, call the wrapped notifier, maybe do something else. What
differs is where its own work sits.

`withLogging` works *after* the call: it logs the outcome, then rethrows a failure so the caller still sees it.
`withThrottle` works *before*: it may decide not to call the wrapped notifier at all. `withRetry` works *around*: it
decides how many times the call happens.

`withThrottle` also needs memory: when it last notified each recipient. That `Map` is created once, when
`withThrottle` runs, and every call of the function it returns shares it. A closure keeps the state private, with no
class and no `#` field.

A decorator must keep the contract of the notifier. If `withLogging` swallowed the error, the code above it would
believe every email was sent. Adding a behaviour should never change what the caller can rely on, only what happens
along the way.
