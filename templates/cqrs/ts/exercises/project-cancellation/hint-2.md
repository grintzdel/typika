A projection may keep its own state from earlier events. Remember each order's total when `OrderPlaced` arrives, and
subtract it when that order's `OrderCancelled` arrives.
