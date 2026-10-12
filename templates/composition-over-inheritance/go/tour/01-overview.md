+++
id = "overview"
title = "Many kinds of products"
file = "cmd/shop/main.go"
+++

The shop sells different kinds of products. An e-book has no shipping. A mug travels as a parcel in a cardboard box.
Cheese needs refrigerated shipping in an insulated box. Some products are on sale. Click **Run** to see the
catalogue.

Each kind of product behaves a bit differently, and the shop keeps inventing new kinds. The question this template
answers is: **how do you describe many kinds of values without a new type for every combination?**

Go has no classes and no inheritance, but it has *embedding*, which looks a lot like it. The base of this template
uses embedding to build a family tree of product types. This template builds each product from small parts instead,
and picks the parts it needs.

In the next steps you will see the embedding version, why it grows so fast, how a product is put together from parts,
and how it uses them.
