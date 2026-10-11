import { vi } from 'vitest'
import { Ledger } from '../src/shop/ledger.ts'

export const fakeServices = () => ({
  ledger: new Ledger(),
  giftCards: { redeem: vi.fn(() => 'gift-1') },
})
