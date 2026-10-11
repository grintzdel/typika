import { placeOrder } from './orders/place-order.js'

export const openShop = (services) => ({
  placeOrder: (order) => placeOrder(order, services),
})
