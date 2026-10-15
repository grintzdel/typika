+++
id = "subject"
title = "The subject announces"
file = "src/main/kotlin/orders/OrderEvents.kt"
region = "subject"
also = ["src/main/kotlin/orders/PlaceOrder.kt"]
+++

`OrderEvents` is the *subject*: the one place that knows who wants to hear about a placed order. It does two things.
`subscribe` adds a subscriber and returns a function that removes it. `publish` hands an `OrderPlaced` event to every
subscriber.

A subscriber is an `OrderPlacedSubscriber`, a `fun interface` with one method, so any lambda that takes an
`OrderPlaced` is one. Kotlin has no built-in event type in its standard library; a `fun interface` and a set of
subscribers are all the pattern needs.

Now open `PlaceOrder.kt`. `placeOrder` saves the order and publishes `OrderPlaced`. It has no `stock`, `notifier` or
`analytics` parameter anymore: it cannot tell how many reactions there are, or what they do.

The event is a `data class` that carries what a subscriber needs to react: the order, its id and its total. Choose
those fields with care. Every subscriber reads them, so removing one later means checking every subscriber.

Subscribing returns its own way out. A reaction that should stop, such as a campaign that ends, calls the
`Unsubscribe` function it received, and nobody else has to know.
