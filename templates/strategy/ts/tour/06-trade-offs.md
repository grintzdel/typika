+++
id = "trade-offs"
title = "When not to use it"
+++

Strategy costs an interface, a class per option and a place to choose between them. For two options that never change,
an `if` is shorter and easier to read. Reach for the pattern when the options keep growing, when their rules get
complex, or when you want to test the code around them without real rules.

Watch the interface. If one strategy needs data the others ignore, you will be tempted to widen `costFor` for everyone.
Pass the data the question needs, not everything a strategy might want.

In TypeScript, a strategy with a single method could be a function type, `(order: Order) => Money`. Classes make the
pattern visible here, but both are valid. Compare with the Go variant, where the strategy *is* a function and the
interface disappears.

Related concepts:

- `typika:open-closed-ts`: Strategy is one way to keep code open for extension and closed for modification.
- `typika:factory-method-ts`: varies creation through inheritance, where Strategy varies behaviour through composition.
