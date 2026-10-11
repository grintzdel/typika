import { CATALOG } from './catalog/catalog.js'
import { formatMoney } from './shop/money.js'

for (const product of CATALOG) {
  const packaging = product.packaging().join(' + ') || 'no packaging'
  console.log(`${product.name.padEnd(40)} ${formatMoney(product.price()).padStart(10)}`)
  console.log(`  shipping: ${product.shippingMethod()}, packaging: ${packaging}`)
}
