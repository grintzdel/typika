# Survive a broker outage

The message broker goes down for maintenance a few minutes every week. Each time, the shop saves the order, then fails
to publish `OrderPlaced`: the customer sees an error for an order that exists, and the warehouse and the loyalty
programme never hear of it.

Make the shop keep working while the broker is down, and make sure no event is lost: once the broker is back,
`Relay.PublishPending()` publishes every event that could not be published, in order, and each one once. The next
order placed also publishes the ones still waiting. `OpenShop` already returns a `Relay`, which does nothing yet.

The expected behaviour is in `internal/app/broker_outage_test.go`. Start with `internal/orders/handler.go`, then
`internal/app/open_shop.go`, where the relay is declared.

Done when all tests pass.
