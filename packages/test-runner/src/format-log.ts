import { format } from './each.ts'

export const formatLog = (args: ReadonlyArray<unknown>): string => {
  const [first, ...rest] = args
  return typeof first === 'string' ? format(first, rest) : format('', args).trimStart()
}
