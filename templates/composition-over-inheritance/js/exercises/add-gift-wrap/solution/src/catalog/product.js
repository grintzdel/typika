import { addMoney } from '../shop/money.js'

export const createProduct = ({ sku, name, basePrice, ...parts }) => ({
  sku,
  name,
  // #region tour:delegate
  price: () => addMoney(parts.pricing.priceOf(basePrice), parts.packaging.fee),
  shippingMethod: () => parts.shipping.method,
  packaging: () => parts.packaging.materials,
  // #endregion
})
