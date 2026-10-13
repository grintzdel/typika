+++
id = "split"
title = "One function per reason to change"
file = "src/main/kotlin/pricing/Pricing.kt"
region = "calculator"
also = ["src/main/kotlin/invoices/Invoice.kt", "src/main/kotlin/orders/OrderValidation.kt"]
+++

`priceOrder` holds every pricing rule: line amounts, the member discount, free shipping from 50.00 EUR. It returns a
`PricedOrder`, a data class with no text in it. When marketing changes the discount, this is the only file you open.

Now open `Invoice.kt`. `formatInvoice` receives a `PricedOrder` and turns it into words. It knows how an invoice
reads, and nothing about how a discount is computed. `validateOrder` does the same for the checks.

None of the three keeps any state, so none of them is a class. In Kotlin a function can live at the top level of a
file: a class with one method and no fields would only add an object to create. The file and the package still give
each job its own place.

`PricedOrder` is the seam between pricing and wording, and `PricingTest` checks the prices without a repository, a
notifier or a single string.
