import * as Context from 'effect/Context'

import type { PublicConfig } from '../domain/public-config.domain-model.ts'

export class AppConfig extends Context.Service<AppConfig, PublicConfig>()('@typika/web/AppConfig') {}
