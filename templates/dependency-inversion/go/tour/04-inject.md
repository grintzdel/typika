+++
id = "inject"
title = "Receive, don't create"
file = "internal/checkout/service.go"
region = "inject"
also = ["internal/checkout/service_test.go", "internal/checkout/fakes_test.go"]
+++

`checkout.New` now receives an `OrderRepository` and a `Notifier`, and keeps them. The service never builds anything
that talks to the outside world.

This is *dependency injection*: passing a value what it needs instead of letting it build it. In Go it needs no
framework and no container: a `New` function with parameters is the whole technique. It also follows the Go habit
"accept interfaces, return structs": `New` takes interfaces and returns a concrete `*Service`.

Open `service_test.go`. The test hands the service a `fakeNotifier`, a struct with one `Notify` method that records
what it was asked to send, and checks that the service used it. The confirmation, which the base could not test at
all, is now an ordinary assertion. The same move lets a test pass a store that fails.
