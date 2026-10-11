export interface LoyaltyProgram {
  award(customerEmail: string, points: number): void
}
