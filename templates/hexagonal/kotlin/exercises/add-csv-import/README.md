# Import orders from a CSV file

The shop now sells on a marketplace, which sends a CSV export of its orders every night. A batch job reads the file:
there is no web server and no HTTP request in that job.

Each row is a single-line order, with the columns `email,name,sku,unitPriceCents,quantity`. `openShop` now returns a
`csvImport` whose `importOrders(csv)` does nothing yet. Make it place one order per row, with the same rules, emails
and events as an order placed over HTTP, and return the ids it placed and the line numbers it rejected (the header is
line 1).

The expected behaviour is in `src/test/kotlin/app/CsvImportTest.kt`. Start with
`src/main/kotlin/orders/OrdersHandler.kt`, where today's only way to place an order lives, and
`src/main/kotlin/app/OpenShop.kt`, where the import is declared.

Done when all tests pass.
