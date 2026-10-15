+++
id = "inject"
title = "Receive, don't create"
file = "src/main/kotlin/checkout/CheckoutService.kt"
region = "inject"
also = ["src/test/kotlin/checkout/CheckoutServiceTest.kt"]
+++

`CheckoutService` now receives an `OrderRepository` and a `Notifier` through its primary constructor. It never
constructs anything that talks to the outside world, and none of its imports point to the `infrastructure` package.

This is *dependency injection*: passing an object what it needs instead of letting it build it. It needs no framework.
In Kotlin it costs one line: `private val` in the constructor declares the parameter and stores it.

Open `CheckoutServiceTest.kt`. `Notifier` is a `fun interface`, so the test's fake notifier is a lambda that records
the recipient. The confirmation, which the base could not test at all, is now an ordinary assertion. The same move lets
a test pass a store that fails, to check that nothing is sent for an order that was not saved.
