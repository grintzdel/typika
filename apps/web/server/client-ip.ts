const UNKNOWN = 'unknown'

const connectionIpOf = (request: Request) => {
  const ip: unknown = Reflect.get(request, 'ip')
  return typeof ip === 'string' && ip !== '' ? ip : UNKNOWN
}

export const clientIpOf =
  ({ trustProxy }: { readonly trustProxy: boolean }) =>
  (request: Request): string => {
    const forwarded = trustProxy ? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() : undefined
    return forwarded === undefined || forwarded === '' ? connectionIpOf(request) : forwarded
  }
