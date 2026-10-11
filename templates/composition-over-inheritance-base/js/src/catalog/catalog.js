import { money } from '../shop/money.js'
import { DiscountedPerishableProduct } from './discounted-perishable-product.js'
import { PerishableProduct } from './perishable-product.js'
import { PhysicalProduct } from './physical-product.js'
import { Product } from './product.js'

export const CATALOG = [
  new Product('EBOOK-TEA', "The tea lover's guide (e-book)", money(990)),
  new PhysicalProduct('MUG-01', 'Stoneware mug', money(1200)),
  new PerishableProduct('CHEESE-01', 'Aged comté, 250 g', money(890)),
  new DiscountedPerishableProduct('YOGURT-01', 'Organic yogurt, best before tomorrow', money(450), 30),
]

export const productBySku = (sku) => {
  const product = CATALOG.find((candidate) => candidate.sku === sku)
  if (product === undefined) throw new Error(`Unknown product ${sku}`)
  return product
}
