# Decorator base: sending notifications

The starting point of `decorator-ts`. The shop emails its customers when an order ships. Sending can fail, so it is
retried; every email is logged; and a customer gets at most one email a minute. `EmailNotifier` does all of it, with
one option per behaviour.

The code works and its tests pass. Open `decorator-ts` to see the same behaviour with the Decorator pattern, or start
the `add-sms-with-retry` exercise there to feel why the pattern exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
