import * as Schema from 'effect/Schema'

import { RegistryIndexSchema } from '../domain/registry-index.domain-model.ts'

export const indexJsonSchema = () => {
  const { schema, definitions } = Schema.toJsonSchemaDocument(RegistryIndexSchema)
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Typika registry index',
    ...schema,
    ...(Object.keys(definitions).length === 0 ? {} : { $defs: definitions }),
  }
}
