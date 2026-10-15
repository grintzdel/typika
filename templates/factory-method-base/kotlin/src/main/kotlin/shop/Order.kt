package shop

typealias Sku = String

enum class Tier { REGULAR, MEMBER }

data class Customer(val name: String, val tier: Tier)

data class OrderLine(val sku: Sku, val quantity: Int, val unitWeightGrams: Int)

data class Order(val customer: Customer, val lines: List<OrderLine>) {
    val weightGrams: Int
        get() = lines.sumOf { it.unitWeightGrams * it.quantity }
}
