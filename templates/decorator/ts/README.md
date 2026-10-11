# Decorator: sending notifications

The shop emails its customers when an order ships. Sending can fail, so it is retried; every email is logged; and a
customer gets at most one email a minute. This template shows the Decorator pattern: `EmailNotifier` only sends, and
each extra behaviour is a separate `Notifier` that wraps another one.

Compare it with its base, `decorator-base-ts`, where `EmailNotifier` does everything, with one option per behaviour.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # sends a few emails, one of them through a flaky server
npm test
```

## What to look at

- `src/notifications/notifier.ts`: the interface every piece implements.
- `src/notifications/email-notifier.ts`: the object being decorated, which only sends.
- `src/notifications/retrying-notifier.ts`, `logging-notifier.ts`, `throttled-notifier.ts`: one decorator per
  behaviour.
- `src/notifications/notifiers.ts`: where the decorators are stacked, and in which order.

## Variants

- JavaScript: `decorator-js`, where each decorator is a function that wraps `notify`.
