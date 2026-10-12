Write the event to an outbox table in the same database transaction as the order. A relay then reads the entries not
yet published, publishes them in order, and marks each one once the broker accepted it.
