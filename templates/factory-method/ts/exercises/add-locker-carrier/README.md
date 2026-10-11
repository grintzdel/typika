# Add a parcel locker carrier

The shop now ships to automatic parcel lockers. The customer collects the parcel from a locker near home, with these
rules:

- tracking numbers start with `LCK`, numbered apart from the other carriers;
- delivered in 2 days;
- the label reads `LOCKER <tracking number> for <customer>, collect within 7 days`;
- a locker compartment holds at most 20 kg: heavier parcels are refused with the message `Too heavy for a locker`,
  and a refused parcel does not use up a tracking number.

Standard and express shipping must keep working as they do today.

You start from the code **before** the Factory Method pattern. Start with `src/shipping/shipping-desk.ts` and
`src/shipping/carrier-name.ts`, and read the new tests in `tests/locker-shipping.test.ts`.

Done when all tests pass.

Once it works, look at `ShippingDesk.ship`. Which lines are the same for every carrier, and which ones did you have to
read to add yours?
