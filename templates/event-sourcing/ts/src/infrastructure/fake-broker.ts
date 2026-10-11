export type Message = {
  readonly topic: string
  readonly payload: Readonly<Record<string, unknown>>
}

export class FakeBroker {
  readonly published: Message[] = []
  private available = true

  goDown(): void {
    this.available = false
  }

  comeBack(): void {
    this.available = true
  }

  publish(topic: string, payload: Readonly<Record<string, unknown>>): void {
    if (!this.available) throw new Error(`Broker unavailable, ${topic} not published`)
    this.published.push({ topic, payload })
    console.log(`broker <- ${topic} ${JSON.stringify(payload)}`)
  }
}
