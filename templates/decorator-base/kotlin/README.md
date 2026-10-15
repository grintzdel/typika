# Decorator base: sending notifications

The starting point of `decorator-kotlin`. The shop emails its customers when an order ships. Sending can fail, so it
is retried; every email is logged; and a customer gets at most one email a minute. `EmailNotifier` does all of it, with
one optional constructor parameter per behaviour.

The code works and its tests pass. Open `decorator-kotlin` to see the same behaviour with the Decorator pattern, or
start the `add-sms-with-retry` exercise there to feel why the pattern exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # sends a few emails, one of them through a flaky server
gradle test
```
