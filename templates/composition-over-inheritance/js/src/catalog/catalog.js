import { money } from '../shop/money.js'
import { cardboardBox, insulatedBox, noPackaging } from './packaging.js'
import { discounted, fullPrice } from './pricing.js'
import { createProduct } from './product.js'
import { noShipping, parcel, refrigerated } from './shipping.js'

export const CATALOG = [
  createProduct({
    sku: 'EBOOK-TEA',
    name: "The tea lover's guide (e-book)",
    basePrice: money(990),
    pricing: fullPrice,
    shipping: noShipping,
    packaging: noPackaging,
  }),
  createProduct({
    sku: 'MUG-01',
    name: 'Stoneware mug',
    basePrice: money(1200),
    pricing: fullPrice,
    shipping: parcel,
    packaging: cardboardBox,
  }),
  createProduct({
    sku: 'CHEESE-01',
    name: 'Aged comté, 250 g',
    basePrice: money(890),
    pricing: fullPrice,
    shipping: refrigerated,
    packaging: insulatedBox,
  }),
  createProduct({
    sku: 'YOGURT-01',
    name: 'Organic yogurt, best before tomorrow',
    basePrice: money(450),
    pricing: discounted(30),
    shipping: refrigerated,
    packaging: insulatedBox,
  }),
]

export const productBySku = (sku) => {
  const product = CATALOG.find((candidate) => candidate.sku === sku)
  if (product === undefined) throw new Error(`Unknown product ${sku}`)
  return product
}
