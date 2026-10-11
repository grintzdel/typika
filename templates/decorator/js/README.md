# Decorator: sending notifications

The shop emails its customers when an order ships. Sending can fail, so it is retried; every email is logged; and a
customer gets at most one email a minute. This template shows the Decorator pattern in JavaScript, where a function
is enough: a notifier is a function `(recipient, message)`, and each extra behaviour is a function that takes a
notifier and returns another one.

Compare it with its base, `decorator-base-js`, where `emailNotifier` does everything, with one option per behaviour.

## Run it

Requires Node.js 22 or later.

```sh
npm install
npm start      # sends a few emails, one of them through a flaky server
npm test
```

## What to look at

- `src/notifications/email-notifier.js`: the notifier being decorated, which only sends.
- `src/notifications/with-retry.js`, `with-logging.js`, `with-throttle.js`: one decorator per behaviour.
- `src/notifications/notifiers.js`: where the decorators are stacked, and in which order.

## Variants

- TypeScript: `decorator-ts`, where each decorator is a class that implements `Notifier`.
