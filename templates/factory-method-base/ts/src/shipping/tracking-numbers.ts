export interface TrackingNumbers {
  next(prefix: string): string
}

export class SequentialTrackingNumbers implements TrackingNumbers {
  private readonly counters = new Map<string, number>()

  next(prefix: string): string {
    const count = (this.counters.get(prefix) ?? 0) + 1
    this.counters.set(prefix, count)
    return `${prefix}-${String(count).padStart(4, '0')}`
  }
}
