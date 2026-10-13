package catalog

import shop.Money

private const val BOX_WEIGHT_IN_GRAMS = 300

class ProductBundle(sku: Sku, name: String, price: Money, val items: List<PhysicalProduct>) :
    PhysicalProduct(sku, name, price, items.sumOf { it.weightInGrams } + BOX_WEIGHT_IN_GRAMS)
