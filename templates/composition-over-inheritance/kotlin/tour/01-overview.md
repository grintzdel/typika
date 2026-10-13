+++
id = "overview"
title = "Many kinds of products"
file = "src/main/kotlin/Main.kt"
+++

The shop sells different kinds of products. An e-book has no shipping. A mug travels as a parcel in a cardboard box.
Cheese needs refrigerated shipping in an insulated box. Some products are on sale. Click **Run** to see the
catalogue.

Each kind of product behaves a bit differently, and the shop keeps inventing new kinds. The question this template
answers is: **how do you describe many kinds of objects without a new class for every combination?**

One answer is inheritance: a subclass for each kind. Kotlin makes you ask for it, because a class is `final` unless
you mark it `open`. Another answer is composition: build each object from small parts, and pick the parts you need.

In the next steps you will see the inheritance version, why it grows so fast, how a product is put together from
parts, and how it hands its work to them.
