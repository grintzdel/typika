package catalog

enum class ShippingMethod { NONE, PARCEL, REFRIGERATED }

interface Shipping {
    val shippingMethod: ShippingMethod
}

object NoShipping : Shipping {
    override val shippingMethod = ShippingMethod.NONE
}

object Parcel : Shipping {
    override val shippingMethod = ShippingMethod.PARCEL
}

object Refrigerated : Shipping {
    override val shippingMethod = ShippingMethod.REFRIGERATED
}
