package orders.domain

sealed class OrderException(message: String) : RuntimeException(message)

class InvalidOrderException(message: String) : OrderException(message)

class OrderNotFoundException(message: String) : OrderException(message)

class OrderConflictException(message: String) : OrderException(message)

class PaymentDeclinedException(message: String) : OrderException(message)
