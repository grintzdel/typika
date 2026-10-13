import type { Language } from '@typika/manifest'

import type { ConceptSection, LanguageLink, ListedTemplate, TemplatePage } from './hub.domain-model.ts'
import type { FacetOptions } from './template-filters.domain-model.ts'

export type HiddenLanguages = ReadonlyArray<Language>

const shown = (hidden: HiddenLanguages) => (link: LanguageLink) => !hidden.includes(link.language)

export const sectionsWithout = (
  sections: ReadonlyArray<ConceptSection>,
  hidden: HiddenLanguages
): ReadonlyArray<ConceptSection> => {
  if (hidden.length === 0) return sections
  return sections.flatMap((section) => {
    const concepts = section.concepts.flatMap((concept) => {
      const languages = concept.languages.filter(shown(hidden))
      const lead = languages[0]
      return lead === undefined ? [] : [{ ...concept, name: lead.name, languages }]
    })
    return concepts.length === 0 ? [] : [{ ...section, concepts }]
  })
}

export const templatesWithout = (
  templates: ReadonlyArray<ListedTemplate>,
  hidden: HiddenLanguages
): ReadonlyArray<ListedTemplate> =>
  hidden.length === 0 ? templates : templates.filter((template) => !hidden.includes(template.language))

export const facetsWithout = (facets: FacetOptions, hidden: HiddenLanguages): FacetOptions =>
  hidden.length === 0
    ? facets
    : {
        ...facets,
        values: facets.values.map((entry) =>
          entry.facet === 'language'
            ? { ...entry, values: entry.values.filter((value) => !(hidden as ReadonlyArray<string>).includes(value)) }
            : entry
        ),
      }

export const templatePageWithout = (page: TemplatePage, hidden: HiddenLanguages): TemplatePage =>
  hidden.length === 0
    ? page
    : {
        ...page,
        languages: page.languages.filter((link) => link.name === page.name || shown(hidden)(link)),
        comparisons: page.comparisons.filter(shown(hidden)),
      }
