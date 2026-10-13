package calc

fun divide(a: Int, b: Int): Int {
    if (b == 0) error("cannot divide $a by zero")
    return a / b
}

fun roundToTens(value: Int): Int = (value + 5) / 10 * 10
