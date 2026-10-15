+++
id = "failure-isolation"
title = "One failure stays one failure"
file = "src/main/kotlin/orders/OrderEvents.kt"
region = "isolation"
also = ["src/test/kotlin/orders/OrderEventsTest.kt"]
+++

Subscribers call other services, and services fail. Without care, a subscriber that throws stops the loop in
`publish`: the subscribers after it are never notified, and the exception reaches `placeOrder`, which knows nothing
about the reaction that failed.

So `publish` calls each subscriber inside its own `try / catch`, and hands the exception to `onSubscriberError`. The
stock service can time out; the customer still receives the confirmation email. `OrderEventsTest.kt` checks it with a
subscriber that throws on purpose.

The loop also runs over a copy of the subscribers, `subscribers.toList()`, so a subscriber that unsubscribes while
being notified does not change the set being walked. Without the copy, the JVM would throw a
`ConcurrentModificationException`.

Try it: the `isolate-failing-subscriber` exercise removes this `try / catch`.
