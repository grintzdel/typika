package catalog

type ShippingMethod string

const (
	NoShipping   ShippingMethod = "none"
	Parcel       ShippingMethod = "parcel"
	Refrigerated ShippingMethod = "refrigerated"
)
