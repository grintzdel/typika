export const createProduct = ({ sku, name, basePrice, ...parts }) => ({
  sku,
  name,
  // #region tour:delegate
  price: () => parts.pricing.priceOf(basePrice),
  shippingMethod: () => parts.shipping.method,
  packaging: () => parts.packaging.materials,
  // #endregion
})
