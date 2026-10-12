# Add gift wrap

Customers can now buy some items gift-wrapped. Gift wrap adds `gift wrap` to the packaging list and costs 3.50. The
fee is added after any discount.

Add three products to the catalogue:

| SKU | Name | Base price | Kind |
|---|---|---|---|
| `MUG-01-GIFT` | Stoneware mug, gift-wrapped | 12.00 | shipped as a parcel, in a cardboard box |
| `CHEESE-01-GIFT` | Aged comté, 250 g, gift-wrapped | 8.90 | perishable: refrigerated, in an insulated box |
| `MUG-02-GIFT` | Holiday mug, gift-wrapped, 20% off | 14.00 | shipped as a parcel, in a cardboard box |

The other products must not change.

You start from the code **before** composition. Start with `internal/catalog/catalog.go` and the product types next
to it, and read the new tests in `internal/catalog/gift_wrap_test.go`.

Done when all tests pass.

Once it works, count your product types. How many would you need if the shop also offered express delivery as an
option?
