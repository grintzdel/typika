# Dependency inversion base: confirming an order

The starting point of `dependency-inversion-ts`. When a customer places an order, `CheckoutService` saves it and emails
a confirmation. It creates its `SmtpMailer` and its `InMemoryOrderStore` itself, in its constructor.

The code works and its tests pass, but they cannot check the confirmation, and every run talks to the SMTP server.
Open `dependency-inversion-ts` to see the same behaviour with the dependencies inverted, or start the
`test-without-smtp` exercise there to feel why the principle exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
