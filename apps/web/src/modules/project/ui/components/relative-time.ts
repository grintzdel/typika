const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1_000],
]

export const relativeTime = (language: string, elapsed: number) => {
  const [unit, size] = UNITS.find(([, length]) => elapsed >= length) ?? ['second', 1_000]
  return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(-Math.round(elapsed / size), unit)
}
