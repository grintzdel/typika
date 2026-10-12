package shop

import "fmt"

type Money struct {
	cents    int64
	currency string
}

func EUR(cents int64) Money {
	return Money{cents: cents, currency: "EUR"}
}

var Zero = EUR(0)

func (m Money) Add(other Money) Money {
	return EUR(m.cents + other.cents)
}

func (m Money) PercentOff(percent int) Money {
	return EUR((m.cents*int64(100-percent) + 50) / 100)
}

func (m Money) String() string {
	return fmt.Sprintf("%d.%02d %s", m.cents/100, m.cents%100, m.currency)
}
