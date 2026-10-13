package catalog

import shop.eur

val CATALOG: List<Product> = listOf(
    Product("EBOOK-TEA", "The tea lover's guide (e-book)", eur(990)),
    PhysicalProduct("MUG-01", "Stoneware mug", eur(1200)),
    PerishableProduct("CHEESE-01", "Aged comté, 250 g", eur(890)),
    DiscountedPerishableProduct("YOGURT-01", "Organic yogurt, best before tomorrow", eur(450), discountPercent = 30),
)

fun productBySku(sku: Sku): Product =
    requireNotNull(CATALOG.find { it.sku == sku }) { "Unknown product $sku" }
