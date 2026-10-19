import { RuntimeKind } from '@typika/manifest'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import { isSupportedLanguage, type SupportedLanguage } from '../../../../i18n/i18n.ts'
import { EmbedPanel, EmbedRun, EmbedTheme } from './constants/embed-option.constant.ts'

export type EmbedLineRange = { readonly from: number; readonly to: number }

export type EmbedOptions = {
  readonly file: string | undefined
  readonly lines: EmbedLineRange | undefined
  readonly tourStep: string | undefined
  readonly panel: EmbedPanel
  readonly readOnly: boolean
  readonly run: EmbedRun
  readonly theme: EmbedTheme
  readonly lang: SupportedLanguage | undefined
}

export const EMBED_PATH_PREFIX = '/embed/'

export const isEmbedPath = (pathname: string): boolean =>
  pathname.startsWith(EMBED_PATH_PREFIX) && pathname.length > EMBED_PATH_PREFIX.length

const LINES = /^L(\d+)(?:-L(\d+))?$/

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined

const oneOf = <A extends string>(values: Readonly<Record<string, A>>, value: unknown, fallback: A): A =>
  Object.values(values).find((candidate) => candidate === value) ?? fallback

const linesOf = (value: unknown): EmbedLineRange | undefined => {
  const match = LINES.exec(textOf(value) ?? '')
  if (match === null) return undefined
  const from = Number(match[1])
  const to = match[2] === undefined ? from : Number(match[2])
  return from >= 1 && to >= from ? { from, to } : undefined
}

export const embedOptionsOf = (search: Readonly<Record<string, unknown>>): EmbedOptions => ({
  file: textOf(search.file),
  lines: linesOf(search.lines),
  tourStep: textOf(search['tour-step']),
  panel: oneOf(EmbedPanel, search.panel, EmbedPanel.CONSOLE),
  readOnly: search.readonly === true || search.readonly === 'true',
  run: oneOf(EmbedRun, search.run, EmbedRun.CLICK),
  theme: oneOf(EmbedTheme, search.theme, EmbedTheme.AUTO),
  lang: isSupportedLanguage(search.lang) ? search.lang : undefined,
})

export const runsOnLoad = (options: EmbedOptions, runtime: RuntimeKind): boolean =>
  options.run === EmbedRun.AUTO && runtime !== RuntimeKind.GO

const HostMessageSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal('typika:goto-step'), id: Schema.String }),
  Schema.Struct({ type: Schema.Literal('typika:set-theme'), theme: Schema.Literals(Object.values(EmbedTheme)) }),
])
export type HostMessage = Schema.Schema.Type<typeof HostMessageSchema>

const decodeHostMessage = Schema.decodeUnknownOption(HostMessageSchema)

export const hostMessageOf = (data: unknown): HostMessage | undefined => Option.getOrUndefined(decodeHostMessage(data))

export type EmbedMessage =
  | { readonly type: 'typika:ready' }
  | { readonly type: 'typika:resize'; readonly height: number }
  | { readonly type: 'typika:test-result'; readonly passed: number; readonly failed: number }

const SNIPPET_HEIGHT = 480

const escapeAttribute = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export const embedSnippetOf = (origin: string, name: string, title: string): string =>
  `<iframe src="${origin}${EMBED_PATH_PREFIX}${name}" title="${escapeAttribute(title)}" width="100%" ` +
  `height="${SNIPPET_HEIGHT}" style="border:0" loading="lazy"></iframe>`
