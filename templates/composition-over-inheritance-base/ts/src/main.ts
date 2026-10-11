import { CATALOG } from './catalog/catalog.ts'
import { formatMoney } from './shop/money.ts'

for (const product of CATALOG) {
  const packaging = product.packaging().join(' + ') || 'no packaging'
  console.log(`${product.name.padEnd(40)} ${formatMoney(product.price()).padStart(10)}`)
  console.log(`  shipping: ${product.shippingMethod()}, packaging: ${packaging}`)
}
