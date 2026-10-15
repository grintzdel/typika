package orders.subscribers

import orders.OrderPlacedSubscriber
import services.LoyaltyProgram
import shop.Tier

fun awardLoyaltyPoints(loyalty: LoyaltyProgram) = OrderPlacedSubscriber { (_, order, total) ->
    if (order.customer.tier == Tier.MEMBER) loyalty.award(order.customer.email, total.cents / 100)
}
