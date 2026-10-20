import { Language } from '@typika/manifest'

const COMMANDS: Readonly<Record<Language, ReadonlyArray<string>>> = {
  [Language.TYPESCRIPT]: ['npm install', 'npm test'],
  [Language.JAVASCRIPT]: ['npm install', 'npm test'],
  [Language.GO]: ['go test ./...'],
  [Language.KOTLIN]: ['gradle test'],
}

export const nextSteps = (dir: string, language: Language): ReadonlyArray<string> => [
  `cd ${/\s/.test(dir) ? JSON.stringify(dir) : dir}`,
  ...COMMANDS[language],
]
