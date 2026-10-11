const escapeRegExp = (text: string) => text.replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`)

const toRegExpSource = (glob: string) =>
  glob
    .split(/(\*\*\/|\*\*|\*|\?)/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?'
      if (part === '**') return '.*'
      if (part === '*') return '[^/]*'
      if (part === '?') return '[^/]'
      return escapeRegExp(part)
    })
    .join('')

export const matchGlob = (glob: string): ((path: string) => boolean) => {
  const regexp = new RegExp(`^${toRegExpSource(glob)}$`)
  return (path) => regexp.test(path)
}
