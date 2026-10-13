import * as Effect from 'effect/Effect'

import { AppConfigInvalidError } from '../domain/errors/app-config-invalid.error.ts'
import type { PublicConfig } from '../domain/public-config.domain-model.ts'

type Env = Readonly<Record<string, string | undefined>>

export const DEFAULT_REGISTRY_INDEX_URL = '/registry/index.json'
export const DEFAULT_TEMPLATE_FILE_URL_TEMPLATE = '/registry/gh/{owner}/{repo}@{ref}/{path}'
export const DEFAULT_TEMPLATE_LISTING_URL_TEMPLATE = '/registry/listing/gh/{owner}/{repo}@{ref}.json'
export const KOTLIN_COMPILER_PATH = '/api/kotlin'

const parseUrl = (name: string, value: string | undefined) =>
  Effect.suspend(() => {
    if (value === undefined || value === '')
      return Effect.fail(new AppConfigInvalidError({ reason: `${name} is missing` }))
    return URL.canParse(value)
      ? Effect.succeed(new URL(value))
      : Effect.fail(new AppConfigInvalidError({ reason: `${name} is not a URL: ${value}` }))
  })

const parseLocation = (name: string, value: string | undefined, fallback: string) =>
  Effect.suspend(() => {
    if (value === undefined || value === '') return Effect.succeed(fallback)
    const isPath = value.startsWith('/') && !value.startsWith('//')
    const isHttp = URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol)
    return isPath || isHttp
      ? Effect.succeed(value)
      : Effect.fail(new AppConfigInvalidError({ reason: `${name} is neither a URL nor an absolute path: ${value}` }))
  })

export const publicConfigFromEnv = (env: Env): Effect.Effect<PublicConfig, AppConfigInvalidError> =>
  Effect.gen(function* () {
    const publicUrl = yield* parseUrl('TYPIKA_PUBLIC_URL', env.TYPIKA_PUBLIC_URL)
    const runtimeUrl = yield* parseUrl('TYPIKA_RUNTIME_ORIGIN', env.TYPIKA_RUNTIME_ORIGIN)
    if (runtimeUrl.origin === publicUrl.origin)
      return yield* new AppConfigInvalidError({ reason: 'TYPIKA_RUNTIME_ORIGIN must differ from the app origin' })
    const packageUrlTemplate = env.TYPIKA_PACKAGE_URL_TEMPLATE
    const registryIndexUrl = yield* parseLocation(
      'TYPIKA_REGISTRY_INDEX_URL',
      env.TYPIKA_REGISTRY_INDEX_URL,
      DEFAULT_REGISTRY_INDEX_URL
    )
    const templateFileUrlTemplate = yield* parseLocation(
      'TYPIKA_TEMPLATE_FILE_URL_TEMPLATE',
      env.TYPIKA_TEMPLATE_FILE_URL_TEMPLATE,
      DEFAULT_TEMPLATE_FILE_URL_TEMPLATE
    )
    const templateListingUrlTemplate = yield* parseLocation(
      'TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE',
      env.TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE,
      DEFAULT_TEMPLATE_LISTING_URL_TEMPLATE
    )
    const kotlinCompiler = env.KOTLIN_COMPILER_URL
    if (kotlinCompiler !== undefined && kotlinCompiler !== '') {
      const { protocol } = yield* parseUrl('KOTLIN_COMPILER_URL', kotlinCompiler)
      if (protocol !== 'http:' && protocol !== 'https:')
        return yield* new AppConfigInvalidError({ reason: `KOTLIN_COMPILER_URL is not an HTTP URL: ${kotlinCompiler}` })
    }
    return {
      publicUrl: publicUrl.href.replace(/\/$/, ''),
      runtimeOrigin: runtimeUrl.origin,
      ...(packageUrlTemplate === undefined || packageUrlTemplate === '' ? {} : { packageUrlTemplate }),
      registryIndexUrl,
      templateFileUrlTemplate,
      templateListingUrlTemplate,
      ...(kotlinCompiler === undefined || kotlinCompiler === '' ? {} : { kotlinCompilerUrl: KOTLIN_COMPILER_PATH }),
    }
  })
