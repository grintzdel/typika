import { Ledger } from '../src/shop/ledger.ts'

export const fakeServices = () => ({
  ledger: new Ledger(),
})
