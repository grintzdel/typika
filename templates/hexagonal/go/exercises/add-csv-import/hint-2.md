Move the rules and the side effects into a function or type that takes a typed request and returns an error when the
order is invalid. The HTTP handler and the CSV import become two thin entry points that call it: the driving adapters
of a hexagonal architecture.
