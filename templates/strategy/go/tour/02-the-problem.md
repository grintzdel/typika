+++
id = "the-problem"
title = "One function, every rule"
+++

Before the pattern, one function priced every option:

```go
freeShipping := option == Standard || isMember
if freeShipping && subtotal.AtLeast(freeShippingThreshold) {
	return shop.Zero
}

isHeavy := order.WeightGrams() > heavyParcelGrams
if option == Express {
	if isHeavy {
		return shop.EUR(1890)
	}
	return shop.EUR(1290)
}
if isHeavy {
	return shop.EUR(690)
}
return shop.EUR(490)
```

This code is short and it works. The problem is in its shape. The free-shipping line mixes the rules of both options
into one condition, and everything after the `if option == Express` block silently means "standard". To add a third
option, you have to read and edit the rules of the two others, and a mistake there changes prices that had nothing to
do with your change.

Open **Diff from base** to see the full before and after.
