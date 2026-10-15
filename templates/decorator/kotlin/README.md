# Decorator: sending notifications

The shop emails its customers when an order ships. Sending can fail, so it is retried; every email is logged; and a
customer gets at most one email a minute. This template shows the Decorator pattern: `EmailNotifier` only sends, and
each extra behaviour is a separate `Notifier` that wraps another one. Each decorator uses `by` delegation and only
overrides the method it changes.

Compare it with its base, `decorator-base-kotlin`, where `EmailNotifier` does everything, with one optional
constructor parameter per behaviour.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # sends a few emails, one of them through a flaky server
gradle test
```

## What to look at

- `src/main/kotlin/notifications/Notifier.kt`: the interface every piece implements.
- `src/main/kotlin/notifications/EmailNotifier.kt`: the object being decorated, which only sends.
- `RetryingNotifier.kt`, `LoggingNotifier.kt`, `ThrottledNotifier.kt`: one decorator per behaviour.
- `src/main/kotlin/notifications/Notifiers.kt`: where the decorators are stacked, and in which order.

## Variants

- TypeScript: `decorator-ts`, with a class per decorator that forwards by hand.
