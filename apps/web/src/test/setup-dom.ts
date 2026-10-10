import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { initI18n } from '../i18n/i18n.ts'

await initI18n('fr')

afterEach(() => cleanup())
