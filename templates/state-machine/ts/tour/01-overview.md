+++
id = "overview"
title = "Four booleans, sixteen states"
file = "src/main.ts"
+++

Click **Run**: an order is placed, paid, shipped; another is cancelled. Each answer carries the order's status.

In the base, that status is not stored anywhere. The row has four booleans, `isPaid`, `isShipped`, `isDelivered` and
`isCancelled`, and `statusOf` guesses a status from them with a chain of `if`. Sixteen combinations exist; six describe a real order.
Nothing stops `isShipped && isCancelled`, and the rules about what may happen next are spread across every route as
more `if`.

A state machine names the states, lists the allowed moves between them in one place, and refuses everything else. You
will see why the booleans fail, the states as a type, the transition table, the guards that the table cannot express,
and when all of this is too much.
