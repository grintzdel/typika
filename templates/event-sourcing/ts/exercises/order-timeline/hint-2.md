Instead of adding a history table next to the row, make the history the record itself: store an event for each thing
that happened, with its time and data, and compute the current status by replaying them. The timeline is then a plain
read of what you already store. That is event sourcing.
