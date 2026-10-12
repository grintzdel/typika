package shop

type Tier string

const (
	Regular Tier = "regular"
	Member  Tier = "member"
)

type Customer struct {
	Name  string
	Email string
	Tier  Tier
}

type OrderLine struct {
	SKU       string
	UnitPrice Money
	Quantity  int
}

type Order struct {
	Customer Customer
	Lines    []OrderLine
}

func (o Order) Total() Money {
	total := Zero
	for _, line := range o.Lines {
		total = total.Add(line.UnitPrice.Times(line.Quantity))
	}
	return total
}
