+++
id = "trade-offs"
title = "When not to use it"
+++

Strategy costs a function per option and a place to choose between them. For two options that never change, a
`switch` is shorter and easier to read. Reach for the pattern when the options keep growing, when their rules get
complex, or when you want to test the code around them without real rules.

A function type fits while a strategy answers one question. When it needs several methods, or carries configuration
that varies per instance, declare an interface instead, as the TypeScript variant does. A one-method interface and a
function type are interchangeable in Go: `http.HandlerFunc` is the standard library doing exactly that.

Watch the signature. If one strategy needs data the others ignore, you will be tempted to widen `ShippingCost` for
everyone. Pass the data the question needs, not everything a strategy might want.

Related concepts:

- `typika:open-closed-ts`: Strategy is one way to keep code open for extension and closed for modification.
- `typika:strategy-ts`: the same pattern with an interface and a class per option.
