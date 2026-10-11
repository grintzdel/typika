Remove `cancel` from the `shipped` row. Nothing else changes: the handler already turns a transition missing from the
table into an `InvalidTransitionError`, and the error into a 409.
