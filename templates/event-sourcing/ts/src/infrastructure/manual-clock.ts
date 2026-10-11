const DAY_MS = 24 * 60 * 60 * 1000

export class ManualClock {
  private current: Date

  constructor(start: string) {
    this.current = new Date(start)
  }

  now(): Date {
    return new Date(this.current)
  }

  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * DAY_MS)
  }
}
