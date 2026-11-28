import type { ReactNode } from 'react'

import { FileKind, fileKindOf } from '../../core/domain/file-kind.domain-model.ts'

const LETTERS = {
  T: 'M0 0h4M2 0v7',
  S: 'M4 .9C3.6.3 2.9 0 2 0 .9 0 .2.7.2 1.7c0 2.2 3.8 1.4 3.8 3.6C4 6.3 3.2 7 2 7 1.1 7 .4 6.7 0 6.1',
  J: 'M1 0h3v5c0 1.2-.8 2-2 2S0 6.2 0 5.2',
  G: 'M4 .9C3.6.3 2.9 0 2 0 .9 0 0 1.6 0 3.5S.9 7 2 7s2-1.3 2-3.2H2.2',
  O: 'M2 0c1.1 0 2 1.6 2 3.5S3.1 7 2 7 0 5.4 0 3.5.9 0 2 0z',
  K: 'M0 0v7M4 0 .75 3.5 4 7',
} as const

type Letter = keyof typeof LETTERS

const Badge = ({ letters, className }: { readonly letters: ReadonlyArray<Letter>; readonly className: string }) => (
  <>
    <rect x="1" y="2" width="14" height="12" rx="2.5" className={`${className} fill-current`} />
    {letters.map((letter, index) => (
      <path
        key={index}
        d={LETTERS[letter]}
        transform={`translate(${3 + index * 6} 4.5)`}
        className="stroke-surface-raised"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    ))}
  </>
)

const Outlined = ({ className, children }: { readonly className: string; readonly children: ReactNode }) => (
  <g
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </g>
)

const GLYPHS: Readonly<Record<FileKind, ReactNode>> = {
  [FileKind.TYPESCRIPT]: <Badge letters={['T', 'S']} className="text-file-typescript" />,
  [FileKind.JAVASCRIPT]: <Badge letters={['J', 'S']} className="text-file-javascript" />,
  [FileKind.GO]: <Badge letters={['G', 'O']} className="text-file-go" />,
  [FileKind.KOTLIN]: <Badge letters={['K', 'T']} className="text-file-kotlin" />,
  [FileKind.JSON]: (
    <Outlined className="text-file-json">
      <path d="M5.5 2.5c-1.5 0-2 .5-2 2v1.5c0 1-.5 2-1.5 2 1 0 1.5 1 1.5 2v1.5c0 1.5.5 2 2 2" />
      <path d="M10.5 2.5c1.5 0 2 .5 2 2v1.5c0 1 .5 2 1.5 2-1 0-1.5 1-1.5 2v1.5c0 1.5-.5 2-2 2" />
    </Outlined>
  ),
  [FileKind.MARKDOWN]: (
    <Outlined className="text-file-markdown">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M3.75 10.5v-5l2 2.5 2-2.5v5M11.5 5.5v5M9.75 8.75l1.75 1.75 1.75-1.75" />
    </Outlined>
  ),
  [FileKind.CONFIG]: (
    <Outlined className="text-file-config">
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="5" cy="4" r="1.5" className="fill-surface-raised" />
      <circle cx="10.5" cy="8" r="1.5" className="fill-surface-raised" />
      <circle cx="7" cy="12" r="1.5" className="fill-surface-raised" />
    </Outlined>
  ),
  [FileKind.SHELL]: (
    <Outlined className="text-file-config">
      <rect x="1" y="2.5" width="14" height="11" rx="2" />
      <path d="m4 6 2 2-2 2M8 10.5h4" />
    </Outlined>
  ),
  [FileKind.ARCHIVE]: (
    <Outlined className="text-file-config">
      <rect x="2.5" y="1.75" width="11" height="12.5" rx="1.5" />
      <path d="M8 1.75v2M7 4.75h2M8 5.75v1.5M7 8.25h2v2.5H7z" />
    </Outlined>
  ),
  [FileKind.TEXT]: (
    <Outlined className="text-fg-subtle">
      <path d="M9.25 1.75h-5.5v12.5h8.5v-9.5z M9.25 1.75v3h3" />
      <path d="M5.75 8.25h4.5M5.75 10.75h4.5" />
    </Outlined>
  ),
}

const ICON = 'size-4 shrink-0'

export const FileIcon = ({ path }: { readonly path: string }) => {
  const kind = fileKindOf(path)
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} data-file-kind={kind}>
      {GLYPHS[kind]}
    </svg>
  )
}

export const FolderIcon = ({ isOpen, isTypika = false }: { readonly isOpen: boolean; readonly isTypika?: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className={`${ICON} ${isTypika ? 'text-accent' : 'text-file-folder'}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinejoin="round"
  >
    {isOpen ? (
      <>
        <path d="M1.75 12.75v-9h4l1.5 1.5h5.5v2" />
        <path d="M1.75 12.75l2-5.5h11l-2 5.5z" className="fill-file-folder-fill" />
      </>
    ) : (
      <path d="M1.75 3.25h4l1.5 1.5h7v8.5H1.75z M1.75 6.25h12.5" className="fill-file-folder-fill" />
    )}
  </svg>
)
