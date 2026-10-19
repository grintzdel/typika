import type { ProjectArchive } from '../../core/domain/project-archive.domain-model.ts'

export const downloadArchive = ({ fileName, bytes }: ProjectArchive) => {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
