export const awardLoyaltyPoints =
  (loyalty) =>
  ({ order, total }) => {
    if (order.customer.tier !== 'member') return
    loyalty.award(order.customer.email, Math.floor(total.cents / 100))
  }
