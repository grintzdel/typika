import type { Message } from '../infrastructure/fake-broker.ts'

// #region tour:consumer
export class LoyaltyPoints {
  private readonly points = new Map<string, number>()

  handle({ topic, payload }: Message): void {
    if (topic !== 'OrderPlaced') return
    const { customerEmail, totalCents } = payload
    if (typeof customerEmail !== 'string' || typeof totalCents !== 'number') return

    this.points.set(customerEmail, this.pointsOf(customerEmail) + Math.floor(totalCents / 100))
  }
  // #endregion

  pointsOf(customerEmail: string): number {
    return this.points.get(customerEmail) ?? 0
  }
}
