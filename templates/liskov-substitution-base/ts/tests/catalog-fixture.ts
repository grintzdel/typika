import { DigitalProduct } from '../src/catalog/digital-product.ts'
import { PhysicalProduct } from '../src/catalog/physical-product.ts'
import { ProductBundle } from '../src/catalog/product-bundle.ts'
import { money } from '../src/shop/money.ts'

export const ADDRESS = '12 rue des Lilas, Lyon'

export const mug = () => new PhysicalProduct('MUG-01', 'Ceramic mug', money(1200), 350)

export const tea = () => new PhysicalProduct('TEA-GREEN', 'Green tea', money(850), 100)

export const kettle = () => new PhysicalProduct('KETTLE-01', 'Kettle', money(5990), 1200)

export const handbook = () =>
  new DigitalProduct('EBOOK-TEA', 'The tea handbook', money(990), 'https://shop.example/d/EBOOK-TEA')

export const teaSet = () => new ProductBundle('TEA-SET', 'Tea set', money(1800), [mug(), tea()])
