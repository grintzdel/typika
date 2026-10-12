import { formatTemplateRef, Language, parseTemplateRef, type ExerciseKind, type Level } from '@typika/manifest'
import type { IndexTemplate, RegistryIndex } from '@typika/registry-tools/index-schema'
import * as Option from 'effect/Option'

import type { Facet } from './constants/facet.constant.ts'

export type IndexTopic = RegistryIndex['vocabulary']['topics'][number]

export type LanguageLink = { readonly language: Language; readonly name: string }

export type ConceptCard = {
  readonly name: string
  readonly label: string
  readonly summary: string
  readonly languages: ReadonlyArray<LanguageLink>
}

export type ConceptSection = {
  readonly category: string
  readonly families: ReadonlyArray<string>
  readonly concepts: ReadonlyArray<ConceptCard>
}

export type ListedTemplate = {
  readonly name: string
  readonly title: string
  readonly summary: string
  readonly language: Language
  readonly level: Level
  readonly values: Readonly<Record<Facet, ReadonlyArray<string>>>
}

export type TopicCrumb = { readonly topic: string; readonly category: string; readonly family?: string }

export type TemplatePage = {
  readonly name: string
  readonly title: string
  readonly summary: string
  readonly language: Language
  readonly level: Level
  readonly license: string
  readonly ref: string
  readonly category: IndexTemplate['category']
  readonly maintainers: ReadonlyArray<string>
  readonly trail: ReadonlyArray<TopicCrumb>
  readonly topics: ReadonlyArray<{ readonly id: string; readonly label: string }>
  readonly languages: ReadonlyArray<LanguageLink>
  readonly tourSteps: ReadonlyArray<string>
  readonly base: string | undefined
  readonly parent: string | undefined
  readonly exercises: ReadonlyArray<{ readonly name: string; readonly kind: ExerciseKind; readonly title: string }>
}

const LANGUAGE_ORDER: ReadonlyArray<Language> = Object.values(Language)

const byLanguage = (a: LanguageLink, b: LanguageLink) =>
  LANGUAGE_ORDER.indexOf(a.language) - LANGUAGE_ORDER.indexOf(b.language)

const isListed = (template: IndexTemplate) => template.manifest.role === 'template'

const topicOf = (index: RegistryIndex, id: string): IndexTopic =>
  index.vocabulary.topics.find((topic) => topic.id === id) ?? { id, label: id, category: id.split('/')[0] ?? id }

const isLanguage = (value: string): value is Language => (LANGUAGE_ORDER as ReadonlyArray<string>).includes(value)

const languagesOf = (template: IndexTemplate): ReadonlyArray<LanguageLink> =>
  [
    { language: template.manifest.facets.language, name: template.name },
    ...Object.entries(template.manifest.variants).flatMap(([language, name]) =>
      isLanguage(language) ? [{ language, name }] : []
    ),
  ].toSorted(byLanguage)

const refKeyOf = (ref: string) =>
  Option.map(parseTemplateRef(ref), ({ owner, repo, path }) =>
    formatTemplateRef(path === undefined ? { owner, repo } : { owner, repo, path })
  )

const nameOfRef = (index: RegistryIndex, ref: string | null): string | undefined => {
  if (ref === null) return undefined
  const key = refKeyOf(ref)
  if (Option.isNone(key)) return ref
  return index.templates.find((template) => Option.contains(refKeyOf(template.ref), key.value))?.name ?? ref
}

export const conceptSectionsOf = (index: RegistryIndex): ReadonlyArray<ConceptSection> => {
  const listed = index.templates.filter(isListed)
  const concepts = new Map<string, ConceptCard & { readonly topic: IndexTopic }>()
  for (const template of listed) {
    const languages = languagesOf(template).filter(({ name }) => listed.some((other) => other.name === name))
    const key = languages.map(({ name }) => name).join(' ')
    const lead = listed.find((other) => other.name === languages[0]?.name) ?? template
    if (concepts.has(key)) continue
    const topic = topicOf(index, lead.manifest.facets.topic[0] ?? lead.name)
    concepts.set(key, { name: lead.name, label: topic.label, summary: lead.manifest.summary, languages, topic })
  }
  const rank = (topic: IndexTopic) => {
    const position = index.vocabulary.topics.findIndex(({ id }) => id === topic.id)
    return position === -1 ? Number.MAX_SAFE_INTEGER : position
  }
  const ordered = [...concepts.values()].toSorted(
    (a, b) => rank(a.topic) - rank(b.topic) || a.name.localeCompare(b.name)
  )
  const sections = new Map<string, { families: Array<string>; concepts: Array<ConceptCard> }>()
  for (const { topic, ...concept } of ordered) {
    const section = sections.get(topic.category) ?? { families: [], concepts: [] }
    sections.set(topic.category, section)
    if (topic.family !== undefined && !section.families.includes(topic.family)) section.families.push(topic.family)
    section.concepts.push(concept)
  }
  return [...sections].map(([category, section]) => ({ category, ...section }))
}

export const listedTemplatesOf = (index: RegistryIndex): ReadonlyArray<ListedTemplate> =>
  index.templates.filter(isListed).map(({ name, category, manifest }) => ({
    name,
    title: manifest.title,
    summary: manifest.summary,
    language: manifest.facets.language,
    level: manifest.facets.level,
    values: {
      topic: manifest.facets.topic,
      language: [manifest.facets.language],
      paradigm: manifest.facets.paradigm,
      level: [manifest.facets.level],
      framework: manifest.facets.framework,
      library: manifest.facets.library,
      useCase: manifest.facets.useCase,
      category: [category],
    },
  }))

const trailOf = (topic: IndexTopic): ReadonlyArray<TopicCrumb> => [
  { topic: topic.category, category: topic.category },
  ...(topic.family === undefined
    ? []
    : [{ topic: `${topic.category}/${topic.family}`, category: topic.category, family: topic.family }]),
]

export const templatePageOf = (index: RegistryIndex, name: string): TemplatePage | undefined => {
  const template = index.templates.find((candidate) => candidate.name === name)
  if (template === undefined) return undefined
  const { manifest } = template
  const topics = manifest.facets.topic.map((id) => topicOf(index, id))
  return {
    name,
    title: manifest.title,
    summary: manifest.summary,
    language: manifest.facets.language,
    level: manifest.facets.level,
    license: manifest.license,
    ref: template.ref,
    category: template.category,
    maintainers: template.maintainers,
    trail: topics[0] === undefined ? [] : trailOf(topics[0]),
    topics: topics.map(({ id, label }) => ({ id, label })),
    languages: languagesOf(template),
    tourSteps: manifest.tour.steps.map((step) => step.title),
    base: nameOfRef(index, manifest.base),
    parent: nameOfRef(index, template.parent),
    exercises: manifest.exercises,
  }
}
