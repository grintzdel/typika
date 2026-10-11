# Import orders from a CSV file

The shop now sells on a marketplace, which sends a CSV export of its orders every night. A batch job reads the file:
there is no web server and no HTTP request in that job.

Each row is a single-line order, with the columns `email,name,sku,unitPriceCents,quantity`. Add
`csvImport.importOrders(csv)` to what `openShop` returns. It places one order per row, with the same rules, emails and
events as an order placed over HTTP, and returns the ids it placed and the line numbers it rejected (the header is
line 1).

The expected behaviour is in `tests/csv-import.test.ts`. Start with `src/orders/orders-handler.ts`, where today's only
way to place an order lives.

Done when all tests pass.
