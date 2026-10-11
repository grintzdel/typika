export const trackSale =
  (analytics) =>
  ({ orderId, total }) =>
    analytics.track('order_placed', { orderId, totalCents: total.cents })
