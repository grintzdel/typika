import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as Schema from 'effect/Schema'

import { TemplateHealthSchema, type TemplateHealth } from '../domain/template-health.domain-model.ts'

export const HEALTH_DIR = 'health'

const decodeHealth = Schema.decodeUnknownSync(TemplateHealthSchema)

export const readHealth = async (root: string): Promise<ReadonlyMap<string, TemplateHealth>> => {
  const dir = join(root, HEALTH_DIR)
  const files = (await readdir(dir).catch(() => [])).filter((file) => file.endsWith('.json')).toSorted()
  return new Map(
    await Promise.all(
      files.map(async (file) => {
        try {
          return [
            file.slice(0, -'.json'.length),
            decodeHealth(JSON.parse(await readFile(join(dir, file), 'utf8'))),
          ] as const
        } catch (cause) {
          throw new Error(`${HEALTH_DIR}/${file} is invalid: ${String(cause)}`, { cause })
        }
      })
    )
  )
}

export const writeHealth = async (root: string, name: string, health: TemplateHealth) => {
  await mkdir(join(root, HEALTH_DIR), { recursive: true })
  await writeFile(join(root, HEALTH_DIR, `${name}.json`), `${JSON.stringify(health, null, 2)}\n`)
}
