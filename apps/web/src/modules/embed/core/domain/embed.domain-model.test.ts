import { describe, expect, it } from 'vitest'

import {
  embedOptionsOf,
  embedSnippetOf,
  hostMessageOf,
  isEmbedPath,
  runsOnLoad,
  type EmbedOptions,
} from './embed.domain-model.ts'

const DEFAULTS: EmbedOptions = {
  file: undefined,
  lines: undefined,
  tourStep: undefined,
  panel: 'console',
  readOnly: false,
  run: 'click',
  theme: 'auto',
  lang: undefined,
}

describe('embedOptionsOf', () => {
  it('falls back to the defaults of ui §13', () => {
    expect(embedOptionsOf({})).toEqual(DEFAULTS)
  })

  it('reads every parameter', () => {
    expect(
      embedOptionsOf({
        file: 'src/checkout.ts',
        lines: 'L10-L24',
        'tour-step': 'extract-strategy',
        panel: 'tests',
        readonly: 'true',
        run: 'auto',
        theme: 'dark',
        lang: 'fr',
      })
    ).toEqual({
      file: 'src/checkout.ts',
      lines: { from: 10, to: 24 },
      tourStep: 'extract-strategy',
      panel: 'tests',
      readOnly: true,
      run: 'auto',
      theme: 'dark',
      lang: 'fr',
    })
  })

  it('accepts the values the router already parsed', () => {
    expect(embedOptionsOf({ readonly: true, 'tour-step': 42 })).toMatchObject({ readOnly: true, tourStep: '42' })
  })

  it('reads a single line', () => {
    expect(embedOptionsOf({ lines: 'L7' }).lines).toEqual({ from: 7, to: 7 })
  })

  it('ignores values it does not know', () => {
    expect(
      embedOptionsOf({ lines: 'L24-L10', panel: 'debug', readonly: 'yes', run: 'now', theme: 'blue', lang: 'de' })
    ).toEqual(DEFAULTS)
    expect(embedOptionsOf({ lines: '10-24' }).lines).toBeUndefined()
  })
})

describe('runsOnLoad', () => {
  it('runs on load when asked to', () => {
    expect(runsOnLoad({ ...DEFAULTS, run: 'auto' }, 'browser-js')).toBe(true)
    expect(runsOnLoad({ ...DEFAULTS, run: 'auto' }, 'kotlin')).toBe(true)
  })

  it('waits for a click by default', () => {
    expect(runsOnLoad(DEFAULTS, 'browser-js')).toBe(false)
  })

  it('never starts Go on load, which downloads 12 MB', () => {
    expect(runsOnLoad({ ...DEFAULTS, run: 'auto' }, 'go')).toBe(false)
  })
})

describe('hostMessageOf', () => {
  it('reads the messages of the host page', () => {
    expect(hostMessageOf({ type: 'typika:goto-step', id: 'add-rule' })).toEqual({
      type: 'typika:goto-step',
      id: 'add-rule',
    })
    expect(hostMessageOf({ type: 'typika:set-theme', theme: 'light' })).toEqual({
      type: 'typika:set-theme',
      theme: 'light',
    })
  })

  it('drops any other message', () => {
    expect(hostMessageOf({ type: 'typika:set-files', files: {} })).toBeUndefined()
    expect(hostMessageOf({ type: 'typika:set-theme', theme: 'blue' })).toBeUndefined()
    expect(hostMessageOf('typika:goto-step')).toBeUndefined()
  })
})

describe('isEmbedPath', () => {
  it('matches the embed routes only', () => {
    expect(isEmbedPath('/embed/strategy-ts')).toBe(true)
    expect(isEmbedPath('/embed')).toBe(false)
    expect(isEmbedPath('/embedded/strategy-ts')).toBe(false)
    expect(isEmbedPath('/play/strategy-ts')).toBe(false)
  })
})

describe('embedSnippetOf', () => {
  it('builds an iframe for the template', () => {
    expect(embedSnippetOf('https://typika.dev', 'strategy-ts', 'Strategy')).toBe(
      '<iframe src="https://typika.dev/embed/strategy-ts" title="Strategy" width="100%" height="480" ' +
        'style="border:0" loading="lazy"></iframe>'
    )
  })

  it('escapes the title', () => {
    expect(embedSnippetOf('https://typika.dev', 'a-ts', 'A "quoted" <title>')).toContain(
      'title="A &quot;quoted&quot; &lt;title&gt;"'
    )
  })
})
