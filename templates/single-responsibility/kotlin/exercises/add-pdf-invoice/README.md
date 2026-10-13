# Add a PDF invoice

Customers ask to download their invoice as a PDF. The shop already wraps its PDF library in a `PdfWriter` service,
declared in `src/main/kotlin/services/PdfWriter.kt`: `write(document)` takes a title, rows of label and amount, and a
total, and returns the file.

A colleague already passes the new `pdf` service to `OrderService` and declared `downloadInvoice(orderId)`, left as a
`TODO()`. Implement it: it finds a placed order, writes its invoice through `pdf` and returns the file. The PDF shows
the same lines, discount, shipping and total as the email. An unknown order throws an `IllegalArgumentException` with
the message `Unknown order <id>`.

The email invoice must not change.

You start from the code **before** the split. Start with `src/main/kotlin/orders/OrderService.kt`, and read the new
tests in `src/test/kotlin/orders/PdfInvoiceTest.kt`. The test setup in `ServicesFixture.kt` already provides a fake
`pdf` service.

Done when all tests pass.

Once it works, look at where the member discount and the shipping fee are computed. How many places would you edit if
the free shipping threshold changed tomorrow?
