export class Ledger {
  readonly entries: string[] = []

  record(entry: string): void {
    this.entries.push(entry)
  }
}
