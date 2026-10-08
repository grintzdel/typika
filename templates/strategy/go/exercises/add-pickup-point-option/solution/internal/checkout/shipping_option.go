package checkout

type ShippingOption string

const (
	Standard    ShippingOption = "standard"
	Express     ShippingOption = "express"
	PickupPoint ShippingOption = "pickup-point"
)

var ShippingOptions = []ShippingOption{Standard, Express, PickupPoint}
