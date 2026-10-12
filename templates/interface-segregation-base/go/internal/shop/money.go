package shop

import "fmt"

type Money struct {
	cents    int64
	currency string
}

func EUR(cents int64) Money {
	return Money{cents: cents, currency: "EUR"}
}

func (m Money) String() string {
	return fmt.Sprintf("%d.%02d %s", m.cents/100, m.cents%100, m.currency)
}
