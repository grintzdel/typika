+++
id = "wrapping"
title = "Before, after or around the call"
file = "src/notifications/logging-notifier.ts"
region = "around"
also = ["src/notifications/throttled-notifier.ts"]
+++

Every decorator follows the same shape: do something, call the wrapped notifier, maybe do something else. What
differs is where its own work sits.

`LoggingNotifier` works *after* the call: it logs the outcome, then rethrows a failure so the caller still sees it.
`ThrottledNotifier` works *before*: it may decide not to call the wrapped notifier at all. `RetryingNotifier` works
*around*: it decides how many times the call happens.

A decorator must keep the contract of the interface. If `LoggingNotifier` swallowed the error, the code above it would
believe every email was sent. Adding a behaviour should never change what the caller can rely on, only what happens
along the way.
