Look at `infra.OrderRow`: does it say when an order was paid, or when it was cancelled? Before adding fields to the
row that every write goes through, ask who needs those dates. Only the dashboard does.
