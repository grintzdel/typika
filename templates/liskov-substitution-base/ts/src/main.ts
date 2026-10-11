import { DigitalProduct } from './catalog/digital-product.ts'
import { PhysicalProduct } from './catalog/physical-product.ts'
import { ProductBundle } from './catalog/product-bundle.ts'
import { checkout } from './checkout/checkout.ts'
import { formatMoney, money } from './shop/money.ts'

const mug = new PhysicalProduct('MUG-01', 'Ceramic mug', money(1200), 350)
const tea = new PhysicalProduct('TEA-GREEN', 'Green tea', money(850), 100)
const handbook = new DigitalProduct('EBOOK-TEA', 'The tea handbook', money(990), 'https://shop.example/d/EBOOK-TEA')
const teaSet = new ProductBundle('TEA-SET', 'Tea set', money(1800), [mug, tea])

const result = checkout([teaSet, mug, handbook], '12 rue des Lilas, Lyon')

for (const parcel of result.parcels) console.log(`parcel    ${parcel.sku}, ${parcel.weightInGrams} g, to ${parcel.address}`)
for (const link of result.downloads) console.log(`download  ${link}`)
console.log(`shipping  ${formatMoney(result.shipping)}`)
console.log(`total     ${formatMoney(result.total)}`)
