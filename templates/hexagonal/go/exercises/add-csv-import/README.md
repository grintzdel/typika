# Import orders from a CSV file

The shop now sells on a marketplace, which sends a CSV export of its orders every night. A batch job reads the file:
there is no web server and no HTTP request in that job.

Each row is a single-line order, with the columns `email,name,sku,unitPriceCents,quantity`. `OpenShop` now returns a
`CSVImport` whose `ImportOrders(csv)` does nothing yet. Make it place one order per row, with the same rules, emails
and events as an order placed over HTTP, and return the ids it placed and the line numbers it rejected (the header is
line 1).

The expected behaviour is in `internal/app/csv_import_test.go`. Start with `internal/orders/handler.go`, where today's
only way to place an order lives, and `internal/app/open_shop.go`, where the import is declared.

Done when all tests pass.
