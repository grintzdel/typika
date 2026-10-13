import { describe, expect, it } from 'vitest'

import { clientIpOf } from './client-ip.ts'

const request = (headers: Record<string, string>, ip?: string) =>
  Object.assign(
    new Request('https://typika.example.org/api/kotlin/compile', { headers }),
    ip === undefined ? {} : { ip }
  )

describe('clientIpOf', () => {
  it('takes the address of the connection', () => {
    expect(clientIpOf({ trustProxy: false })(request({ 'x-forwarded-for': '9.9.9.9' }, '1.2.3.4'))).toBe('1.2.3.4')
  })

  it('takes the address the proxy appended last when the proxy is trusted', () => {
    const forwarded = request({ 'x-forwarded-for': '9.9.9.9, 5.6.7.8' }, '172.18.0.2')

    expect(clientIpOf({ trustProxy: true })(forwarded)).toBe('5.6.7.8')
  })

  it('falls back to the connection without a forwarded address', () => {
    expect(clientIpOf({ trustProxy: true })(request({}, '1.2.3.4'))).toBe('1.2.3.4')
  })
})
