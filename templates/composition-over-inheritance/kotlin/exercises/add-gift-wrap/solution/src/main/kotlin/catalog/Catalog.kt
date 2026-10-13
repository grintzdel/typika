package catalog

import shop.eur

val CATALOG: List<Product> = listOf(
    Product(
        "EBOOK-TEA", "The tea lover's guide (e-book)", eur(990),
        pricing = FullPrice, shipping = NoShipping, packaging = NoPackaging,
    ),
    Product(
        "MUG-01", "Stoneware mug", eur(1200),
        pricing = FullPrice, shipping = Parcel, packaging = CardboardBox,
    ),
    Product(
        "CHEESE-01", "Aged comté, 250 g", eur(890),
        pricing = FullPrice, shipping = Refrigerated, packaging = InsulatedBox,
    ),
    Product(
        "YOGURT-01", "Organic yogurt, best before tomorrow", eur(450),
        pricing = discounted(30), shipping = Refrigerated, packaging = InsulatedBox,
    ),
    Product(
        "MUG-01-GIFT", "Stoneware mug, gift-wrapped", eur(1200),
        pricing = FullPrice, shipping = Parcel, packaging = GiftWrapped(CardboardBox),
    ),
    Product(
        "CHEESE-01-GIFT", "Aged comté, 250 g, gift-wrapped", eur(890),
        pricing = FullPrice, shipping = Refrigerated, packaging = GiftWrapped(InsulatedBox),
    ),
    Product(
        "MUG-02-GIFT", "Holiday mug, gift-wrapped, 20% off", eur(1400),
        pricing = discounted(20), shipping = Parcel, packaging = GiftWrapped(CardboardBox),
    ),
)

fun productBySku(sku: Sku): Product =
    requireNotNull(CATALOG.find { it.sku == sku }) { "Unknown product $sku" }
