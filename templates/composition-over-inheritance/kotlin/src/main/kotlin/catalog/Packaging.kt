package catalog

interface Packaging {
    val packaging: List<String>
}

object NoPackaging : Packaging {
    override val packaging = emptyList<String>()
}

object CardboardBox : Packaging {
    override val packaging = listOf("cardboard box")
}

object InsulatedBox : Packaging {
    override val packaging = listOf("insulated box")
}
