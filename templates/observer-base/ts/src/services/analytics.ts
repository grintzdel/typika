export interface Analytics {
  track(event: string, properties: Readonly<Record<string, string | number>>): void
}
