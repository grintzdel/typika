# Decorator: sending notifications

The shop emails its customers when an order ships. Sending can fail, so it is retried; every email is logged; and a
customer gets at most one email a minute. This template shows the Decorator pattern in Go: `Email` only sends, and
each extra behaviour is a struct that embeds the `Notifier` it wraps, like HTTP middleware.

Compare it with its base, `decorator-base-go`, where `Email` does everything, with one option per behaviour.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # sends a few emails, one of them through a flaky server
go test ./...
```

## What to look at

- `internal/notifications/notifier.go`: the interface every piece implements.
- `internal/notifications/email.go`: the value being decorated, which only sends.
- `internal/notifications/retrying.go`, `logging.go`, `throttled.go`: one decorator per behaviour.
- `internal/notifications/notifiers.go`: where the decorators are stacked, and in which order.

## Variants

- TypeScript: `decorator-ts`, with a class per decorator.
