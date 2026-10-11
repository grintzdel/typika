+++
id = "orchestrator"
title = "The orchestrator keeps the order"
file = "src/orders/order-service.ts"
region = "orchestrator"
+++

Something still has to run the jobs in the right order: check, price, save, then email. That is the one job left to
`OrderService`, and `placeOrder` now reads like the business process it implements.

The order of the calls is a rule of its own. Validation runs first, so an invalid order is neither priced, saved nor
emailed. The id comes from the repository, so the invoice can only be written after saving. Those rules are visible
in four lines instead of being buried in one long method.

`OrderService` creates its helpers itself, because none of them talks to the outside world. The repository and the
notifier do, so they arrive through the constructor and tests replace them with fakes. Moving the helpers to the
constructor as well is a separate decision, covered by the dependency inversion principle.
