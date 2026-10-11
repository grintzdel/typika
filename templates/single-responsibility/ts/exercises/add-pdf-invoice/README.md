# Add a PDF invoice

Customers ask to download their invoice as a PDF. The shop already wraps its PDF library in a `PdfWriter` service,
declared in `src/services/pdf-writer.ts`: `write(document)` takes a title, rows of label and amount, and a total, and
returns the file.

Add `orderService.downloadInvoice(orderId)`. It finds a placed order, writes its invoice through the new `pdf`
service and returns the file. The PDF shows the same lines, discount, shipping and total as the email. An unknown order
throws `Unknown order <id>`.

The email invoice must not change.

You start from the code **before** the split. Start with `src/orders/order-service.ts`, and read the new tests in
`tests/pdf-invoice.test.ts`. The test setup in `tests/services-fixture.ts` already provides a fake `pdf` service.

Done when all tests pass.

Once it works, look at where the member discount and the shipping fee are computed. How many places would you edit if
the free shipping threshold changed tomorrow?
