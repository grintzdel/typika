import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import { describe, expect, it } from 'vitest'

import { publicConfigFromEnv } from './public-config-from-env.ts'

const ENV = {
  TYPIKA_PUBLIC_URL: 'https://typika.example.org',
  TYPIKA_RUNTIME_ORIGIN: 'https://typika-run.example.net',
}

describe('publicConfigFromEnv', () => {
  it('exposes the app and runtime origins', () => {
    expect(Effect.runSync(publicConfigFromEnv(ENV))).toMatchObject({
      publicUrl: 'https://typika.example.org',
      runtimeOrigin: 'https://typika-run.example.net',
    })
  })

  it('reads the registry served by the app itself by default', () => {
    expect(Effect.runSync(publicConfigFromEnv(ENV))).toMatchObject({
      registryIndexUrl: '/registry/index.json',
      templateFileUrlTemplate: '/registry/gh/{owner}/{repo}@{ref}/{path}',
      templateListingUrlTemplate: '/registry/listing/gh/{owner}/{repo}@{ref}.json',
    })
  })

  it('exposes the registry URLs when set', () => {
    const config = Effect.runSync(
      publicConfigFromEnv({
        ...ENV,
        TYPIKA_REGISTRY_INDEX_URL: 'https://registry.example.org/index.json',
        TYPIKA_TEMPLATE_FILE_URL_TEMPLATE: 'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}',
        TYPIKA_TEMPLATE_LISTING_URL_TEMPLATE:
          'https://data.jsdelivr.com/v1/packages/gh/{owner}/{repo}@{ref}?structure=flat',
      })
    )

    expect(config).toMatchObject({
      registryIndexUrl: 'https://registry.example.org/index.json',
      templateFileUrlTemplate: 'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}',
      templateListingUrlTemplate: 'https://data.jsdelivr.com/v1/packages/gh/{owner}/{repo}@{ref}?structure=flat',
    })
  })

  it('exposes the package URL template when set', () => {
    const config = Effect.runSync(
      publicConfigFromEnv({ ...ENV, TYPIKA_PACKAGE_URL_TEMPLATE: 'https://esm.sh/{name}@{version}{path}' })
    )

    expect(config.packageUrlTemplate).toBe('https://esm.sh/{name}@{version}{path}')
  })

  it('keeps only the origin of the runtime URL', () => {
    const config = Effect.runSync(publicConfigFromEnv({ ...ENV, TYPIKA_RUNTIME_ORIGIN: 'https://run.example.net/' }))

    expect(config.runtimeOrigin).toBe('https://run.example.net')
  })

  it('never exposes server-only variables', () => {
    const config = Effect.runSync(publicConfigFromEnv({ ...ENV, GITHUB_CLIENT_SECRET: 'secret' }))

    expect(JSON.stringify(config)).not.toContain('secret')
  })

  it.each([
    ['the app URL is missing', { TYPIKA_RUNTIME_ORIGIN: ENV.TYPIKA_RUNTIME_ORIGIN }],
    ['the runtime origin is missing', { TYPIKA_PUBLIC_URL: ENV.TYPIKA_PUBLIC_URL }],
    ['the runtime origin is not a URL', { ...ENV, TYPIKA_RUNTIME_ORIGIN: 'typika-run' }],
    ['the runtime shares the app origin', { ...ENV, TYPIKA_RUNTIME_ORIGIN: 'https://typika.example.org' }],
    ['the registry index is not a URL', { ...ENV, TYPIKA_REGISTRY_INDEX_URL: 'registry/index.json' }],
    ['a template URL is not HTTP', { ...ENV, TYPIKA_TEMPLATE_FILE_URL_TEMPLATE: 'javascript:alert(1)' }],
  ])('fails when %s', (_, env) => {
    const exit = Effect.runSyncExit(publicConfigFromEnv(env))

    expect(Exit.isFailure(exit)).toBe(true)
    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain('AppConfigInvalidError')
  })
})
