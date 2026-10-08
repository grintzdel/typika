package checkout

type ShippingOption string

const (
	Standard ShippingOption = "standard"
	Express  ShippingOption = "express"
)

var ShippingOptions = []ShippingOption{Standard, Express}
