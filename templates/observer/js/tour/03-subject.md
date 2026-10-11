+++
id = "subject"
title = "The platform is the subject"
file = "src/orders/order-events.js"
region = "subject"
also = ["src/orders/place-order.js"]
+++

`OrderEvents` is the *subject*: the one place that knows who wants to hear about a placed order. Compare it with
`observer-ts`: there is no list of subscribers and no loop. `OrderEvents` extends `EventTarget`, which keeps the
listeners and calls them in order. `publish` wraps the placed order in a `CustomEvent`, whose `detail` carries it, and
hands it to `dispatchEvent`.

Unsubscribing is built in too. `subscribe` accepts an `AbortSignal`: once its `AbortController` aborts, the platform
removes the listener. One controller can end several subscriptions at once.

Now open `place-order.js`. `placeOrder` saves the order and publishes it. It receives no `stock`, `notifier` or
`analytics` anymore: it cannot tell how many reactions there are, or what they do.

The event carries what a subscriber needs to react: the order, its id and its total. Choose those fields with care.
Every subscriber reads them, so removing one later means checking every subscriber.
