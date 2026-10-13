package catalog

import shop.Money

class GiftCard(sku: Sku, name: String, price: Money) : PhysicalProduct(sku, name, price, weightInGrams = 0)
