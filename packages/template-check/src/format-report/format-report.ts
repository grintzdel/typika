import { isWarning } from '@typika/manifest'

import type { TemplateCheck } from '../check-templates/check-templates.ts'

const failed = (check: TemplateCheck) => check.issues.some((issue) => !isWarning(issue))

const headerOf = (check: TemplateCheck) => {
  const label = check.name === undefined ? check.dir : `${check.name} (${check.dir})`
  return `${failed(check) ? '✗' : '✓'} ${label}${check.exercisesRun ? ', exercises run' : ''}`
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const hasErrors = (checks: ReadonlyArray<TemplateCheck>): boolean => checks.some(failed)

export const formatReport = (checks: ReadonlyArray<TemplateCheck>): string => {
  const warnings = checks.flatMap((check) => check.issues).filter(isWarning).length
  return [
    ...checks.flatMap((check) => [
      headerOf(check),
      ...check.issues.map((issue) => `  ${issue.code} ${issue.path}: ${issue.message}`),
    ]),
    '',
    `${plural(checks.length, 'template')}, ${checks.filter(failed).length} with errors, ${plural(warnings, 'warning')}.`,
  ].join('\n')
}
