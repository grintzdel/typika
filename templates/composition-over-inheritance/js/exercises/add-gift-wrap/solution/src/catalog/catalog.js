import { money } from '../shop/money.js'
import { cardboardBox, giftWrapped, insulatedBox, noPackaging } from './packaging.js'
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
  createProduct({
    sku: 'MUG-01-GIFT',
    name: 'Stoneware mug, gift-wrapped',
    basePrice: money(1200),
    pricing: fullPrice,
    shipping: parcel,
    packaging: giftWrapped(cardboardBox),
  }),
  createProduct({
    sku: 'CHEESE-01-GIFT',
    name: 'Aged comté, 250 g, gift-wrapped',
    basePrice: money(890),
    pricing: fullPrice,
    shipping: refrigerated,
    packaging: giftWrapped(insulatedBox),
  }),
  createProduct({
    sku: 'MUG-02-GIFT',
    name: 'Holiday mug, gift-wrapped, 20% off',
    basePrice: money(1400),
    pricing: discounted(20),
    shipping: parcel,
    packaging: giftWrapped(cardboardBox),
  }),
]

export const productBySku = (sku) => {
  const product = CATALOG.find((candidate) => candidate.sku === sku)
  if (product === undefined) throw new Error(`Unknown product ${sku}`)
  return product
}
