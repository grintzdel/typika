export const reserveStock =
  (stock) =>
  ({ order }) =>
    stock.reserve(order.lines)
