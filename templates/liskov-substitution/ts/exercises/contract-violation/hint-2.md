`checkout` prices the shipping with `weightInGrams()` before it calls `ship()`. If the two disagree, the customer pays
for one weight and the carrier receives another. Make the announced weight include everything that is shipped.
