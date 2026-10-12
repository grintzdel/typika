# Composition vs inheritance: a product catalogue

The shop sells e-books, physical products and perishable food, some of it at a discount. This template builds every
product from three small parts: how it is priced, how it is shipped and how it is packed. A product is a combination
of parts, not the last link of a chain of embedded structs.

Compare it with its base, `composition-over-inheritance-base-go`, where each kind of product embeds the one before.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # prints the catalogue
go test ./...
```

## What to look at

- `internal/catalog/pricing.go`, `shipping.go`, `packaging.go`: the parts, each with a few ready-made choices.
- `internal/catalog/product.go`: a product, which holds its parts and asks them.
- `internal/catalog/catalog.go`: where each product picks its parts.

## Variants

- TypeScript: `composition-over-inheritance-ts`, where the base is a tree of subclasses.
