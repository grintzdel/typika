+++
id = "split"
title = "One class per reason to change"
file = "src/pricing/price-calculator.ts"
region = "calculator"
also = ["src/invoices/invoice-formatter.ts", "src/orders/order-validator.ts"]
+++

`PriceCalculator` holds every pricing rule: line amounts, the member discount, free shipping from 50.00 EUR. It
returns a `PricedOrder`, plain data with no text in it. When marketing changes the discount, this is the only file
you open.

Now open `invoice-formatter.ts`. `InvoiceFormatter` receives a `PricedOrder` and turns it into words. It knows how an
invoice reads, and nothing about how a discount is computed. `OrderValidator` does the same for the checks.

`PricedOrder` is the seam between pricing and wording. Anything that needs the prices, such as a PDF or a summary
page, reads it instead of parsing the email.

Each piece can now be tested on its own: `tests/price-calculator.test.ts` checks the prices without a repository,
a notifier or a single string.
