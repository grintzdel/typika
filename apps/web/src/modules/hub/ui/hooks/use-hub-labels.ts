import { Level, Paradigm, UseCase } from '@typika/manifest'
import { HealthStatus } from '@typika/registry-tools/health-status'
import { useTranslation } from 'react-i18next'

import { languageNameOf } from '../../../shared/core/domain/language-name.domain-model.ts'
import { Facet } from '../../core/domain/constants/facet.constant.ts'
import { TopicCategory, TopicFamily } from '../../core/domain/constants/topic-category.constant.ts'

const isOneOf = <T extends string>(values: Readonly<Record<string, T>>, value: string): value is T =>
  (Object.values(values) as ReadonlyArray<string>).includes(value)

export const useHubLabels = () => {
  const { t } = useTranslation('hub')

  const category = (id: string) => (isOneOf(TopicCategory, id) ? t(`categories.${id}`) : id)
  const family = (id: string) => (isOneOf(TopicFamily, id) ? t(`families.${id}`) : id)
  const level = (id: string) => (isOneOf(Level, id) ? t(`values.level.${id}`) : id)

  const topic = (path: string) => {
    const [categoryId = path, familyId] = path.split('/')
    return familyId === undefined ? category(categoryId) : family(familyId)
  }

  const value = (facet: Facet, id: string) => {
    switch (facet) {
      case Facet.TOPIC:
        return topic(id)
      case Facet.LANGUAGE:
        return languageNameOf(id)
      case Facet.LEVEL:
        return level(id)
      case Facet.PARADIGM:
        return isOneOf(Paradigm, id) ? t(`values.paradigm.${id}`) : id
      case Facet.USE_CASE:
        return isOneOf(UseCase, id) ? t(`values.useCase.${id}`) : id
      case Facet.CATEGORY:
        return id === 'official' || id === 'community' ? t(`values.category.${id}`) : id
      case Facet.HEALTH:
        return isOneOf(HealthStatus, id) ? t(`values.health.${id}`) : id
      default:
        return id
    }
  }

  return { category, family, language: languageNameOf, level, value, facet: (id: Facet) => t(`facets.${id}`) }
}
