import { notFound } from '@tanstack/react-router'

import { queryOfSearch, searchOfQuery } from '../../modules/hub/core/domain/template-query.domain-model.ts'
import { runHubProgram } from '../../modules/hub/core/hub.runtime.ts'
import { getTemplatePageProgram } from '../../modules/hub/core/programs/get-template-page/get-template-page.program.ts'
import { listConceptsProgram } from '../../modules/hub/core/programs/list-concepts/list-concepts.program.ts'
import { listHubTemplatesProgram } from '../../modules/hub/core/programs/list-hub-templates/list-hub-templates.program.ts'

export const loadHome = () => runHubProgram(listConceptsProgram)

export const loadTemplates = () => runHubProgram(listHubTemplatesProgram)

export const loadTemplatePage = async (name: string) => {
  const page = await runHubProgram(getTemplatePageProgram(name))
  if (page === undefined) throw notFound()
  return page
}

export const validateTemplatesSearch = (search: Readonly<Record<string, unknown>>) =>
  searchOfQuery(queryOfSearch(search))
