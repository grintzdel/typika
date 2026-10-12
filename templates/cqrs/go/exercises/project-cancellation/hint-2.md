A projection may keep its own state from earlier events. Remember each order's total when `OrderPlaced` arrives, in
the `orders` map it already keeps, and subtract it when that order's `OrderCancelled` arrives.
