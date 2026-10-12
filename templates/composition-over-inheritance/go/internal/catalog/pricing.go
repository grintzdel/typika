package catalog

import "example.com/shop/internal/shop"

type Pricing func(basePrice shop.Money) shop.Money

func FullPrice(basePrice shop.Money) shop.Money {
	return basePrice
}

func Discounted(percent int) Pricing {
	return func(basePrice shop.Money) shop.Money {
		return basePrice.PercentOff(percent)
	}
}
