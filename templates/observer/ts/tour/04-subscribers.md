+++
id = "subscribers"
title = "Subscribers, wired in one place"
file = "src/open-shop.ts"
region = "wiring"
also = [
  "src/orders/subscribers/reserve-stock.ts",
  "src/orders/subscribers/send-confirmation.ts",
  "src/orders/subscribers/track-sale.ts",
]
+++

Each reaction is now a subscriber in its own file. `sendConfirmation` receives the `Notifier` it needs, and returns a
function that turns an `OrderPlaced` into an email. It does not know about the stock or the analytics.

`openShop` is where the shop is assembled: it creates the subject, subscribes the three reactions and hands the subject
to `placeOrder`. Adding a reaction means writing a subscriber and adding one line here. `placeOrder` and the other
subscribers stay untouched.

The order of the `subscribe` calls is the order in which subscribers run. Nothing else should depend on it: if the
email must only go out once the stock is reserved, that is a rule between two reactions, and the pattern hides it.

Try it: the `add-loyalty-points` exercise asks you to add a reaction that only runs during a campaign, starting from
the base.
