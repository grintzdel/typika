export {
  checkTemplates,
  officialRefOf,
  type TemplateCheck,
  type TemplateLayout,
  type TemplateSet,
} from './check-templates/check-templates.ts'
export { checkExercises, type RunTests, type TestRun } from './check-exercises/check-exercises.ts'
export { checkRefs } from './check-refs/check-refs.ts'
export { formatReport, hasErrors } from './format-report/format-report.ts'
export {
  contentOf,
  listFilesOnDisk,
  listFilesWithGit,
  readTemplates,
  type ListFiles,
} from './read-templates/read-templates.ts'
export { runTestsInProcess } from './run-tests-in-process/run-tests-in-process.ts'
