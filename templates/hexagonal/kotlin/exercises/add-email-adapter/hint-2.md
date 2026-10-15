`OrderNotification` is sealed, so a `when` on it with one branch per subtype needs no `else`. Every notification
carries its `order`, with its id, the customer's name and email, and the total, whose `toString` reads `32.50 EUR`.
Only `Cancelled` carries a `reason`.
