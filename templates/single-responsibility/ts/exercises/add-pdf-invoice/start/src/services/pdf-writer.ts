export type PdfRow = {
  readonly label: string
  readonly amount: string
}

export type PdfDocument = {
  readonly title: string
  readonly rows: readonly PdfRow[]
  readonly total: string
}

export interface PdfWriter {
  write(document: PdfDocument): Uint8Array
}
