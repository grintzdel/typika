+++
id = "subscribers"
title = "Subscribers, wired in one place"
file = "src/open-shop.js"
region = "wiring"
also = [
  "src/orders/subscribers/reserve-stock.js",
  "src/orders/subscribers/send-confirmation.js",
  "src/orders/subscribers/track-sale.js",
]
+++

Each reaction is now a subscriber in its own file. `sendConfirmation` receives the notifier it needs, and returns a
function that turns a placed order into an email. It does not know about the stock, the analytics or even the event:
it receives the `detail`, not the `CustomEvent`.

`openShop` is where the shop is assembled: it creates the subject, subscribes the three reactions and hands the subject
to `placeOrder`. Adding a reaction means writing a subscriber and adding one line here. `placeOrder` and the other
subscribers stay untouched.

The order of the `subscribe` calls is the order in which subscribers run. Nothing else should depend on it: if the
email must only go out once the stock is reserved, that is a rule between two reactions, and the pattern hides it.

Try it: the `add-loyalty-points` exercise asks you to add a reaction that only runs during a campaign, starting from
the base.
