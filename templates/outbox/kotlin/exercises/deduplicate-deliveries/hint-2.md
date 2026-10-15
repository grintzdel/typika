Keep the keys of the messages already handled (`OrderPlaced` plus the order id) and ignore a message whose key you have
seen. An idempotent consumer makes at-least-once delivery behave like exactly-once processing.
