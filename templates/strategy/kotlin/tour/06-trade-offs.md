+++
id = "trade-offs"
title = "When not to use it"
+++

Strategy costs an interface, an object per option and a place to choose between them. For two options that never
change, a `when` on the option is shorter and easier to read. Reach for the pattern when the options keep growing, when
their rules get complex, or when you want to test the code around them without real rules.

The `fun interface` lets you choose the form of each strategy. Use a lambda for a one-off, like the flat rate in the
test. Use a named `object` when the rules deserve a name and a file. Use a `class` when a strategy carries
configuration, such as a rate that varies per carrier.

Watch the interface. If one strategy needs data the others ignore, you will be tempted to widen `costFor` for everyone.
Pass the data the question needs, not everything a strategy might want.

Related concepts:

- `typika:open-closed-kotlin`: Strategy is one way to keep code open for extension and closed for modification.
- `typika:factory-method-kotlin`: varies creation through inheritance, where Strategy varies behaviour through
  composition.
