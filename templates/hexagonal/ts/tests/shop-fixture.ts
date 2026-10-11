import { openShop } from '../src/open-shop.ts'

export type Shop = ReturnType<typeof openShop>

export const ada = { name: 'Ada', email: 'ada@example.com' }

export const grace = { name: 'Grace', email: 'grace@example.com' }

export const orderOf = (customer: { readonly name: string; readonly email: string }, totalCents: number) => ({
  customer,
  lines: [{ sku: 'TEST-SKU', unitPriceCents: totalCents, quantity: 1 }],
})

export const placeOrder = (shop: Shop, body: unknown): string => {
  const response = shop.http.handle({ method: 'POST', path: '/orders', body })
  return String(response.body.orderId)
}

export const post = (shop: Shop, path: string, body?: unknown) => shop.http.handle({ method: 'POST', path, body })

export const get = (shop: Shop, path: string) => shop.http.handle({ method: 'GET', path })
