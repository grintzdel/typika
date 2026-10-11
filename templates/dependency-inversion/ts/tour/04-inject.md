+++
id = "inject"
title = "Receive, don't create"
file = "src/checkout/checkout-service.ts"
region = "inject"
also = ["tests/checkout-service.test.ts"]
+++

`CheckoutService` now receives an `OrderRepository` and a `Notifier` through its constructor. It never calls `new` on
anything that talks to the outside world, and none of its imports point to `src/infrastructure/`.

This is *dependency injection*: passing an object what it needs instead of letting it build it. It needs no framework.
A constructor parameter is enough.

Open `checkout-service.test.ts`. The test hands the service a fake notifier, a plain object with a `notify` function,
and checks that the service used it. The confirmation, which the base could not test at all, is now an ordinary
assertion. The same move lets a test pass a store that fails, to check that nothing is sent for an order that was not
saved.
