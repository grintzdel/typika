package shop

type Tier string

const (
	Regular Tier = "regular"
	Member  Tier = "member"
)

type Customer struct {
	Name string
	Tier Tier
}

type OrderLine struct {
	SKU             string
	UnitPrice       Money
	Quantity        int
	UnitWeightGrams int
}

type Order struct {
	Customer Customer
	Lines    []OrderLine
}

func (o Order) Subtotal() Money {
	subtotal := Zero
	for _, line := range o.Lines {
		subtotal = subtotal.Add(line.UnitPrice.Times(line.Quantity))
	}
	return subtotal
}

func (o Order) WeightGrams() int {
	weight := 0
	for _, line := range o.Lines {
		weight += line.UnitWeightGrams * line.Quantity
	}
	return weight
}
