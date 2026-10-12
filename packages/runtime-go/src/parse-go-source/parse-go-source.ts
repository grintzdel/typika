export type SourcePosition = { readonly line: number; readonly column: number }

export type GoImport = { readonly path: string; readonly position: SourcePosition }

export type GoSource = {
  readonly packageName: string
  readonly imports: ReadonlyArray<GoImport>
  readonly buildConstraint: string | undefined
  readonly tests: ReadonlyArray<string>
  readonly hasTestMain: boolean
}

type Token = { readonly kind: 'ident' | 'punct' | 'string'; readonly text: string; readonly position: SourcePosition }

const isIdentStart = (char: string) => /[\p{L}_]/u.test(char)
const isIdentPart = (char: string) => /[\p{L}\p{N}_]/u.test(char)

const tokenize = (source: string): { tokens: ReadonlyArray<Token>; leadingComments: ReadonlyArray<string> } => {
  const tokens: Array<Token> = []
  const leadingComments: Array<string> = []
  let index = 0
  let line = 1
  let lineStart = 0
  const position = (): SourcePosition => ({ line, column: index - lineStart + 1 })
  const advance = (count: number) => {
    for (let step = 0; step < count; step += 1) {
      if (source[index] === '\n') {
        line += 1
        lineStart = index + 1
      }
      index += 1
    }
  }

  while (index < source.length) {
    const char = source[index] ?? ''
    const next = source[index + 1]
    if (/\s/.test(char)) {
      advance(1)
    } else if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index)
      const comment = source.slice(index, end === -1 ? source.length : end)
      if (tokens.length === 0) leadingComments.push(comment)
      advance(comment.length)
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2)
      advance((end === -1 ? source.length : end + 2) - index)
    } else if (char === '"' || char === '`' || char === "'") {
      const start = position()
      let end = index + 1
      while (end < source.length && source[end] !== char) end += char !== '`' && source[end] === '\\' ? 2 : 1
      if (char !== "'") tokens.push({ kind: 'string', text: source.slice(index + 1, end), position: start })
      advance(end + 1 - index)
    } else if (isIdentStart(char)) {
      const start = position()
      let end = index + 1
      while (end < source.length && isIdentPart(source[end] ?? '')) end += 1
      tokens.push({ kind: 'ident', text: source.slice(index, end), position: start })
      advance(end - index)
    } else {
      tokens.push({ kind: 'punct', text: char, position: position() })
      advance(1)
    }
  }
  return { tokens, leadingComments }
}

const BUILD_DIRECTIVE = /^\/\/go:build\s+(.+)$/

const isTestName = (name: string, prefix: string) =>
  name.startsWith(prefix) && (name.length === prefix.length || !/\p{Ll}/u.test(name.charAt(prefix.length)))

const readImports = (tokens: ReadonlyArray<Token>, start: number) => {
  const imports: Array<GoImport> = []
  let index = start
  const readSpec = () => {
    const token = tokens[index]
    if (token !== undefined && token.kind !== 'string' && (token.kind === 'ident' || token.text === '.')) index += 1
    const path = tokens[index]
    if (path?.kind === 'string') {
      imports.push({ path: path.text, position: path.position })
      index += 1
    }
  }
  while (tokens[index]?.text === 'import' && tokens[index]?.kind === 'ident') {
    index += 1
    if (tokens[index]?.text === '(') {
      index += 1
      while (index < tokens.length && tokens[index]?.text !== ')') {
        if (tokens[index]?.text === ';') index += 1
        else readSpec()
      }
      index += 1
    } else {
      readSpec()
    }
    if (tokens[index]?.text === ';') index += 1
  }
  return imports
}

const matches = (tokens: ReadonlyArray<Token>, at: number, pattern: ReadonlyArray<string | undefined>) =>
  pattern.every((text, offset) => text === undefined || tokens[at + offset]?.text === text)

const topLevelFunctions = (tokens: ReadonlyArray<Token>) => {
  const functions: Array<{ readonly name: string; readonly at: number }> = []
  let depth = 0
  tokens.forEach((token, index) => {
    if (token.kind === 'string') return
    if (token.text === '{') depth += 1
    else if (token.text === '}') depth -= 1
    else if (depth === 0 && token.kind === 'ident' && token.text === 'func') {
      const name = tokens[index + 1]
      if (name?.kind === 'ident') functions.push({ name: name.text, at: index + 2 })
    }
  })
  return functions
}

export const parseGoSource = (source: string): GoSource | undefined => {
  const { tokens, leadingComments } = tokenize(source)
  if (tokens[0]?.text !== 'package' || tokens[1]?.kind !== 'ident') return undefined
  const functions = topLevelFunctions(tokens)
  const takesPointerTo = (at: number, type: string) =>
    matches(tokens, at, ['(', undefined, '*', undefined, '.', type, ')'])
  return {
    packageName: tokens[1].text,
    imports: readImports(tokens, tokens[2]?.text === ';' ? 3 : 2),
    buildConstraint: leadingComments.map((comment) => BUILD_DIRECTIVE.exec(comment)?.[1]?.trim()).find(Boolean),
    tests: functions
      .filter(({ name, at }) => isTestName(name, 'Test') && name !== 'TestMain' && takesPointerTo(at, 'T'))
      .map(({ name }) => name),
    hasTestMain: functions.some(({ name, at }) => name === 'TestMain' && takesPointerTo(at, 'M')),
  }
}
