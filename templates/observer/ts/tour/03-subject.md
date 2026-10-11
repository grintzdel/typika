+++
id = "subject"
title = "The subject announces"
file = "src/orders/order-events.ts"
region = "subject"
also = ["src/orders/place-order.ts"]
+++

`OrderEvents` is the *subject*: the one place that knows who wants to hear about a placed order. It does two things.
`subscribe` adds a subscriber and returns a function that removes it. `publish` hands an `OrderPlaced` event to every
subscriber.

Now open `place-order.ts`. `placeOrder` saves the order and publishes `OrderPlaced`. It has no `stock`, `notifier` or
`analytics` parameter anymore: it cannot tell how many reactions there are, or what they do.

The event carries what a subscriber needs to react: the order, its id and its total. Choose those fields with care.
Every subscriber reads them, so removing one later means checking every subscriber.

Subscribing returns its own way out. A reaction that should stop, such as a campaign that ends, calls the
`Unsubscribe` function it received, and nobody else has to know.
