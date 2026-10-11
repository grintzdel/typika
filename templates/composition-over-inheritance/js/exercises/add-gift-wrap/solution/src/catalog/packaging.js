import { addMoney, money, ZERO } from '../shop/money.js'

const GIFT_WRAP_FEE = money(350)

export const noPackaging = { materials: [], fee: ZERO }

export const cardboardBox = { materials: ['cardboard box'], fee: ZERO }

export const insulatedBox = { materials: ['insulated box'], fee: ZERO }

export const giftWrapped = (packaging) => ({
  materials: [...packaging.materials, 'gift wrap'],
  fee: addMoney(packaging.fee, GIFT_WRAP_FEE),
})
