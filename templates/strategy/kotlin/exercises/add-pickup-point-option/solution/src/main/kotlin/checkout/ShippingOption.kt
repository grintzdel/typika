package checkout

enum class ShippingOption(val label: String) {
    STANDARD("standard"),
    EXPRESS("express"),
    PICKUP_POINT("pickup-point"),
}
