# Decorator base: sending notifications

The starting point of `decorator-go`. The shop emails its customers when an order ships. Sending can fail, so it is
retried; every email is logged; and a customer gets at most one email a minute. `Email` does all of it, with one
field of `EmailOptions` per behaviour.

The code works and its tests pass. Open `decorator-go` to see the same behaviour with the Decorator pattern, or start
the `add-sms-with-retry` exercise there to feel why the pattern exists.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop
go test ./...
```
