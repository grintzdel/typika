import { money } from '../shop/money.ts'
import { cardboardBox, insulatedBox, noPackaging } from './packaging.ts'
import { discounted, fullPrice } from './pricing.ts'
import { Product, type Sku } from './product.ts'
import { noShipping, parcel, refrigerated } from './shipping.ts'

export const CATALOG: readonly Product[] = [
  new Product('EBOOK-TEA', "The tea lover's guide (e-book)", money(990), {
    pricing: fullPrice,
    shipping: noShipping,
    packaging: noPackaging,
  }),
  new Product('MUG-01', 'Stoneware mug', money(1200), {
    pricing: fullPrice,
    shipping: parcel,
    packaging: cardboardBox,
  }),
  new Product('CHEESE-01', 'Aged comté, 250 g', money(890), {
    pricing: fullPrice,
    shipping: refrigerated,
    packaging: insulatedBox,
  }),
  new Product('YOGURT-01', 'Organic yogurt, best before tomorrow', money(450), {
    pricing: discounted(30),
    shipping: refrigerated,
    packaging: insulatedBox,
  }),
]

export const productBySku = (sku: Sku): Product => {
  const product = CATALOG.find((candidate) => candidate.sku === sku)
  if (product === undefined) throw new Error(`Unknown product ${sku}`)
  return product
}
