package catalog

type Packaging struct {
	Materials []string
}

var (
	NoPackaging  = Packaging{}
	CardboardBox = Packaging{Materials: []string{"cardboard box"}}
	InsulatedBox = Packaging{Materials: []string{"insulated box"}}
)
