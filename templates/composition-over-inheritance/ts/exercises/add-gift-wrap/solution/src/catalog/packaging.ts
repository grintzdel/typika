import { addMoney, money, ZERO, type Money } from '../shop/money.ts'

export type PackagingPolicy = {
  readonly materials: readonly string[]
  readonly fee: Money
}

const GIFT_WRAP_FEE = money(350)

export const noPackaging: PackagingPolicy = { materials: [], fee: ZERO }

export const cardboardBox: PackagingPolicy = { materials: ['cardboard box'], fee: ZERO }

export const insulatedBox: PackagingPolicy = { materials: ['insulated box'], fee: ZERO }

export const giftWrapped = (packaging: PackagingPolicy): PackagingPolicy => ({
  materials: [...packaging.materials, 'gift wrap'],
  fee: addMoney(packaging.fee, GIFT_WRAP_FEE),
})
