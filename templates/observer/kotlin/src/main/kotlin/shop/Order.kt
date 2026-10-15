package shop

typealias Sku = String

enum class Tier { REGULAR, MEMBER }

data class Customer(val name: String, val email: String, val tier: Tier)

data class OrderLine(val sku: Sku, val unitPrice: Money, val quantity: Int)

data class Order(val customer: Customer, val lines: List<OrderLine>) {
    val total: Money
        get() = lines.fold(Money.ZERO) { sum, line -> sum + line.unitPrice * line.quantity }
}
