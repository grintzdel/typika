import { makeVirtualFs, ProjectPathSchema } from '@typika/runtime-core'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { describe, expect, it } from 'vitest'

import { deleteProjectFilesProgram } from './delete-project-files.program.ts'

const path = Schema.decodeUnknownSync(ProjectPathSchema)

describe('deleteProjectFilesProgram', () => {
  it('deletes the files from the runtime, skipping the ones it does not hold', async () => {
    const fs = await Effect.runPromise(
      makeVirtualFs(
        new Map([
          [path('src/a.ts'), 'a'],
          [path('src/b.ts'), 'b'],
        ])
      )
    )

    await Effect.runPromise(deleteProjectFilesProgram({ fs }, [path('src/unknown.ts'), path('src/a.ts')]))

    expect([...fs.files().keys()]).toEqual(['src/b.ts'])
  })
})
