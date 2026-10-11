import { addMoney, multiplyMoney, ZERO } from './money.js'

export const totalOf = (order) =>
  order.lines.reduce((sum, line) => addMoney(sum, multiplyMoney(line.unitPrice, line.quantity)), ZERO)
