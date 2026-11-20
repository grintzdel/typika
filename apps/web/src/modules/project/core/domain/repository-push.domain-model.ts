import { exportedFilesOf } from './project-archive.domain-model.ts'

export const INITIAL_COMMIT_MESSAGE = 'Initial commit from Typika'
const README_FILE = 'README.md'
const REPOSITORY_NAME = /^[A-Za-z0-9._-]{1,100}$/
const RESERVED_NAMES: ReadonlySet<string> = new Set(['.', '..'])

export type PushedRepository = { readonly fullName: string; readonly htmlUrl: string }

export const isRepositoryName = (name: string): boolean => REPOSITORY_NAME.test(name) && !RESERVED_NAMES.has(name)

export const repositoryNameOf = (projectName: string): string =>
  projectName
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 100) || 'typika-project'

export const repositoryFilesOf = ({
  files,
  ref,
  includeTypikaFiles,
  title,
  templateUrl,
}: {
  readonly files: ReadonlyMap<string, string>
  readonly ref: string
  readonly includeTypikaFiles: boolean
  readonly title: string
  readonly templateUrl: string
}): ReadonlyMap<string, string> => {
  const exported = exportedFilesOf({ files, ref, includeTypikaFiles })
  return exported.has(README_FILE)
    ? exported
    : new Map([[README_FILE, `# ${title}\n\nCreated from [${title}](${templateUrl}) on Typika.\n`], ...exported])
}
