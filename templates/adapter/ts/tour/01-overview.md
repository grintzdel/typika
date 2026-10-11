+++
id = "overview"
title = "A payment SDK that speaks its own language"
file = "src/main.ts"
+++

The shop takes payments through LegacyPay, a third-party SDK. It works, but it has its own conventions: amounts in
cents, the euro as the number `978`, and every result as a numeric code such as `51` or `91`. Click **Run** to pay
with a few test cards and cancel the paid order.

The shop cannot change the SDK, and one day it will change provider. The question this template answers is: **how
do you use an interface you do not control, without letting it spread through your own code?**

The Adapter pattern gives one answer. Write the interface your code wants, and put a single class between it and the
SDK, which translates one into the other.

In the next steps you will see the code before the pattern, the SDK, the interface the shop wants, and the adapter's
two jobs: translating calls and translating errors.
