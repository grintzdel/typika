package broken

func Total(values []int) int {
	sum := 0
	for _, value := range values {
		sum += value
	}
	return sum + missing
}

func Name() string { return 42 }
