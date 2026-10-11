# Decorator base: sending notifications

The starting point of `decorator-js`. The shop emails its customers when an order ships. Sending can fail, so it is
retried; every email is logged; and a customer gets at most one email a minute. `emailNotifier` does all of it, with
one option per behaviour.

The code works and its tests pass. Open `decorator-js` to see the same behaviour with the Decorator pattern, or start
the `add-sms-with-retry` exercise there to feel why the pattern exists.

## Run it

Requires Node.js 22 or later.

```sh
npm install
npm start
npm test
```
