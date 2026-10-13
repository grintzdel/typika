package services

data class PdfRow(val label: String, val amount: String)

data class PdfDocument(val title: String, val rows: List<PdfRow>, val total: String)

fun interface PdfWriter {
    fun write(document: PdfDocument): ByteArray
}
