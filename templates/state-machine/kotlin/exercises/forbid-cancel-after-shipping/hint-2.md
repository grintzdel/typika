Remove `CANCEL` from the `Shipped` row of `movesFrom`. Nothing else changes: `transition` already turns a move missing
from the table into an `InvalidTransitionException`, and the handler turns the exception into a 409.
