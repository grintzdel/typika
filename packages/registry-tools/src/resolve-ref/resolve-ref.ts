import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

import { formatTemplateRef, parseTemplateRef, type TemplateFiles, type TemplateRef } from '@typika/manifest'
import { contentOf } from '@typika/template-check'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import { RefUnresolvableError } from '../domain/errors/ref-unresolvable.error.ts'

export type PinnedRef = TemplateRef & { readonly ref: string }

export type ResolveRef = (ref: PinnedRef) => Effect.Effect<TemplateFiles, RefUnresolvableError>

export const keyOf = ({ owner, repo, path }: TemplateRef): string =>
  formatTemplateRef(path === undefined ? { owner, repo } : { owner, repo, path })

export const keyOfRef = (ref: string): Option.Option<string> => Option.map(parseTemplateRef(ref), keyOf)

export type LocalCheckout = { readonly repo: string; readonly prefix: string }

export type LocalCheckouts = Readonly<Record<string, LocalCheckout>>

export const parseCheckout = (value: string, cwd: string): LocalCheckouts => {
  const [repo, dir] = value.split('=')
  if (repo === undefined || dir === undefined || !/^[^/=]+\/[^/=]+$/.test(repo) || dir === '')
    throw new Error(`--checkout expects owner/repo=<directory>, got ${value}`)
  return { [repo]: { repo: resolve(cwd, dir), prefix: '' } }
}

const git = (cwd: string, args: ReadonlyArray<string>, input?: string) =>
  Effect.callback<Buffer, RefUnresolvableError>((resume) => {
    const child = spawn('git', ['-C', cwd, ...args])
    const chunks: Array<Buffer> = []
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.on('error', (cause) => resume(Effect.fail(new RefUnresolvableError({ reason: cause.message }))))
    child.on('close', (code) =>
      resume(
        code === 0
          ? Effect.succeed(Buffer.concat(chunks))
          : Effect.fail(new RefUnresolvableError({ reason: `git ${args[0] ?? ''} exited with ${code ?? 'a signal'}` }))
      )
    )
    child.stdin.end(input)
  })

const readBlobs = (cwd: string, ids: ReadonlyArray<string>) =>
  Effect.map(git(cwd, ['cat-file', '--batch'], ids.map((id) => `${id}\n`).join('')), (output) => {
    const blobs: Array<Uint8Array> = []
    let offset = 0
    for (const _ of ids) {
      const headerEnd = output.indexOf(0x0a, offset)
      const size = Number(output.subarray(offset, headerEnd).toString('utf8').split(' ')[2])
      blobs.push(new Uint8Array(output.subarray(headerEnd + 1, headerEnd + 1 + size)))
      offset = headerEnd + 1 + size + 1
    }
    return blobs
  })

export const makeGitResolver =
  (checkouts: LocalCheckouts): ResolveRef =>
  ({ owner, repo, path, ref }) =>
    Effect.gen(function* () {
      const checkout = checkouts[`${owner}/${repo}`]
      if (checkout === undefined) {
        return yield* new RefUnresolvableError({ reason: `no local checkout of github:${owner}/${repo}` })
      }
      const repoRoot = checkout.repo
      yield* git(repoRoot, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).pipe(
        Effect.mapError(() => new RefUnresolvableError({ reason: `commit ${ref} does not exist` }))
      )
      const dir = [checkout.prefix, path].filter((segment) => segment !== undefined && segment !== '').join('/')
      const listing = (yield* git(repoRoot, ['ls-tree', '-r', '-z', ref, '--', dir === '' ? '.' : `${dir}/`])).toString(
        'utf8'
      )
      const blobs = listing
        .split('\0')
        .filter((line) => line !== '')
        .map((line) => {
          const [meta = '', file = ''] = line.split('\t')
          return { id: meta.split(' ')[2] ?? '', path: dir === '' ? file : file.slice(dir.length + 1) }
        })
      if (blobs.length === 0) return yield* new RefUnresolvableError({ reason: `no template at ${ref}` })
      const contents = yield* readBlobs(
        repoRoot,
        blobs.map((blob) => blob.id)
      )
      return new Map(blobs.map((blob, index) => [blob.path, contentOf(contents[index] ?? new Uint8Array())] as const))
    })
