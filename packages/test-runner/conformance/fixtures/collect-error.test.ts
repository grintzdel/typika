import { it } from 'vitest'

it('is never collected', () => {})

throw new Error('module failed to load')
