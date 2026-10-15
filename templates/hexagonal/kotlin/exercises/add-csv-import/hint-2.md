Move the rules and the side effects into a class that takes typed input and throws when the order is invalid. The
HTTP handler and the CSV import become two thin entry points that call it: the driving adapters of a hexagonal
architecture.
