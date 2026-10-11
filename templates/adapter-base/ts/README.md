# Adapter base: taking payments

The starting point of `adapter-ts`. The shop takes payments through LegacyPay, a third-party SDK with its own
conventions: amounts in cents, currencies as ISO numeric codes, results as numeric response codes. `Checkout` and
`Cancellation` call the SDK directly, and each one reads its codes.

The code works and its tests pass. Open `adapter-ts` to see the same behaviour with the Adapter pattern, or start the
`switch-provider` exercise there to feel why the pattern exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
