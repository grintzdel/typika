const NO_MATCH = Number.POSITIVE_INFINITY

const holdsInOrder = (text: string, query: string) => {
  let index = 0
  for (const character of text) if (character === query[index]) index += 1
  return index === query.length
}

const tierOf = (path: string, query: string) => {
  const lowerPath = path.toLowerCase()
  const name = lowerPath.slice(lowerPath.lastIndexOf('/') + 1)
  if (name.includes(query)) return 0
  if (holdsInOrder(name, query)) return 1
  if (lowerPath.includes(query)) return 2
  if (holdsInOrder(lowerPath, query)) return 3
  return NO_MATCH
}

const nameLengthOf = (path: string) => path.length - path.lastIndexOf('/') - 1

export const matchPaths = (paths: ReadonlyArray<string>, query: string): ReadonlyArray<string> => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return paths
  return paths
    .map((path) => ({ path, tier: tierOf(path, needle) }))
    .filter(({ tier }) => tier !== NO_MATCH)
    .toSorted((a, b) => a.tier - b.tier || nameLengthOf(a.path) - nameLengthOf(b.path) || a.path.localeCompare(b.path))
    .map(({ path }) => path)
}
